# Recommendation: keep pages derived from own descriptors

No, this source fact does not change the recommendation. Keep deriving each page lazily from the actual map's own data descriptors. Do not route the hot path through `data/charmap.ts`'s `lookup` or its `_` chunks, even behind a guard. A guard strong enough to be correct costs about as much as the derivation, and it fixes none of `_`'s structural problems.

## Why reusing `_` / `lookup` is unsafe

1. **Missing and empty are merged.** `lookup` returns `''` both for a missing key and for an own `''` value. Your contract keeps those apart, so `lookup` cannot be used as written.
2. **Chunks may be holey, and reads walk the prototype.**
   - If `_` or any `xNN` chunk has holes, `_[high]` and `chunk[low]` consult `Array.prototype` at read time.
   - Suppose someone adds `Array.prototype[5] = 'z'` or an index getter after import. `lookup` would then return data, or run a getter, that the real path never touches. The real path consults `Object.prototype`, because the charmap is a plain `{}`.
   - So reuse would both invent values and add observable getter calls.
3. **Pre-import setters can split `_` from `charmap`.**
   - `charmap[k] = v` is a `[[Set]]`. An `Object.prototype` setter for a single-character key, installed before import, can swallow the write or redirect it, for example by defining a different value on the receiver.
   - `_[0x98] = x98` has the same exposure if `_` is a sparse array and `Array.prototype` has an index setter.
   - The actual map, not `_`, defines behavior. This is Sol's point, and it is correct.
4. **Hangul is not in `_`.** It is computed. Pages built from the map just reference the strings that are already materialized, with no concatenation per lookup. That is cheaper than `lookup`'s path, not more expensive.

## Why a "simpler guard" fails

A key count catches swallowed writes. It misses a setter that redefines the key on the receiver with a different value. A correct certificate has to compare every value with `getOwnPropertyDescriptor`:

- Done once at import, that is about 11k+ descriptor reads added to every user's cold start.
- Done per page, it is exactly the derivation.

Even after certification, you would still copy holey chunks into hole-free pages and still handle `''` versus missing. Reuse buys nothing measurable, so don't run it as an arm.

A separate observation for the deferred representation discussion: the eager 11,172-string Hangul materialization is a real cold-cost and heap item. It belongs to the focused review's lazy-public-materialization track, not this experiment.

## Concrete contract holes to close in your design

1. **Page storage construction.** "All 256 own data slots" must be built with `CreateDataProperty` semantics. That means `Object.defineProperty` per index or an array literal. It must not use `push`, index assignment on `new Array(n)`, or `Array.prototype.map`, which consults species.
   - Cleaner option: an `Int32Array(256)` per page holding an index into a hole-free value list, with `-1` for missing and a separate code for "own but not a string".
   - Typed-array integer indices never consult the prototype, `fill` is safe, and the heap is smaller.
   - Measure it as a storage variant inside the existing grid cells, not as a new axis.
2. **Own non-string data values.** If the map has own `undefined`, numbers, or objects (only possible after exposure, but derivation must not assume that), the page must mark the slot "defer to generic for this character". It must not mark it missing, because own `undefined` is `in`-true. Also mark accessors as defer.
3. **Restart scope.** "Restart generic from 0" must restart only the character loop, using the already-coerced input and the already-read options.
   - Re-entering the top-level function would replay `toString` coercion and option getters, which is an observable duplicate.
   - Also confirm that no earlier character in the fast loop did anything observable before the restart. Page hits and ordinary `in` checks against `Object.prototype` are not observable.
4. **Code point vs code unit.**
   - Pages are indexed by 16-bit units. If the existing loop iterates by code point, astral characters must bypass pages.
   - A high surrogate inside a valid pair must not match a lone-surrogate own key, such as `'\uD83D'`, through the page.
   - Add tests for paired and unpaired surrogates against the old implementation.
5. **Invalidation beyond exposure.** Exposure drops pages, but internal mutation must drop them too. This covers `setData` merge-in-place, reset, and any internal write to the shared map, for both the node and browser APIs.
   - Reset should hand back a new object with a fresh WeakMap entry, not reuse stale pages.
6. **Deep-import reachability.** Confirm that the `package.json` `exports` field forbids `dist/*` and chunk deep imports in both the ESM and CJS conditions.
   - If the module holding `charmap` is reachable, a consumer can mutate it without triggering exposure tracking, and pages go stale silently.
   - Add a package-acceptance test that deep imports fail.
7. **Directory reads.** A null-prototype directory is correct. Read it only with `dir[high]` and an `undefined` check, never `in`, so you don't depend on the directory's shape. Treat any non-page value as "build page".
8. **The miss path's operation must match the old path exactly.**
   - If old code did `map[char]`, an inherited getter ran once. Your path does `in`, sees true, restarts generic, and the generic path runs it once. That is the same count, which is good.
   - Verify that the generic path does not also do its own `in` before `[[Get]]` if the old path didn't. An inherited `has` is unobservable on ordinary objects, so this mainly matters for Proxy-in-chain cases, and those require exposure first.

## Measurement notes

- Expect Cyrillic to touch about 1 page and Korean about 44 pages, so about 11k descriptor reads once per map. Report it separately as first-touch cost and heap, not folded into warm numbers.
- Your stop rule (warm dense-script gain under 15%) and the paired-bootstrap protocol are fine.
- The `--prof` C++ tick split should tell you whether Korean's remaining gap to Unidecode is lookup cost or string building. If it is string building, no index design closes it, and that is a valid reason to stop.

Send the selected patch and the measurements when ready.