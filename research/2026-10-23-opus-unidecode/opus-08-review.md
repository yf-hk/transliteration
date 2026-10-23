# Final review: positive-only lazy page index

**Verdict: no blocker in the supplied code.** There is one item to verify outside this file before promotion: `deepClone`'s read semantics on the original map. There are also a few small maintainability nits.

## Verified correct

**Stale-map safety.**
- Pages store only own data-property strings read through the captured `getOwnDescriptor`. That call never runs user code.
- Absences are never cached, so a later inherited addition can't be masked.
- A cached own value always shadows anything added to the prototype later.
- Moving to `'exposed'` drops the page directory with the state object. Every later `readMap` call and every `transliterate` call re-reads `mapAccess`, so exposure is monotonic across instances sharing the map.
- The ASCII invariant is checked once at registration. It stays valid because own properties can only change through a reference, and every reference-granting path (setData return, getter receiver) marks the map exposed first.

**Getter and reentrancy.**
- The speculative loop runs no user code. It uses descriptor reads, `in` on an ordinary object, string concatenation of already-proven strings, and a string `unknown`.
- Breaking out after setting `'exposed'` therefore means no getter has run yet. The generic loop then sees `usePrivateMapping === false` and runs each getter exactly once.
- In the Chinese/ignore loop, `usePrivateMapping` is captured once, but `readMap` rechecks state on each call. A reentrant `setData` or getter mid-loop is handled: the new `this.map` is either exposed or unregistered, and both fall through to `map[char]`.
- `hasPunctuationOrSpace(s)` and `` ` ${s}` `` on object `s` coerce in the same per-character order as before. Non-string `unknown` skips the speculative path entirely.

**Surrogates.**
- Paired surrogates give the full code point, width 2.
- A lone high or lone low surrogate gives its own code, width 1. The `charCodeAt` NaN at end-of-string fails both comparisons.
- `String.fromCodePoint(code)` round-trips the lone-surrogate key in both `privateValue` callers.
- `readMap`'s `codePointAt(0)` agrees with the loop decoding.

**Missing and empty mappings.**
- `''` is cached and returned because the sentinel is `undefined`, not falsiness.
- Own `undefined`, `null`, non-string values, and own accessors all fail the descriptor check. They then hit `char in map`, which marks the map exposed and delegates to the generic `map[char] ?? unknown ?? ''`. Output stays identical to the live path.
- Truly absent keys produce `unknown`, matching `?? opt.unknown ?? ''`.

**Fast-path guards.**
- `start ? … : str` and `unchangedStart ? … : str` are correct, since any substitution sets the offset to at least 1.
- The ASCII shortcut in `transliterate` requires an empty own-key `confOptions` and a string `source`, so `String(source)` coercion still happens exactly once on the slow path.
- `defaultOptions` is passed uncloned, but nothing on that path mutates it.

## Verify before promotion (possibly actionable)

**1. `setData` clones the original map before any exposure.**
`deepClone(this.defaultMap)` and `deepClone(this.map)` both read the possibly private original. Only the *clone* is marked exposed afterwards.
- If `deepClone` iterates with `for…in` without an own check, or otherwise uses `[[Get]]` on inherited enumerable keys, an inherited enumerable getter runs with the original map as receiver. That is exactly the leak this change closes elsewhere.
- If `deepClone` iterates only own keys (`Object.keys`, `structuredClone`, or `for…in` with `hasOwn` before the read), there's no issue. Own entries are data properties, so no getter can fire.

If it does read inherited keys, the fix that preserves 2.6.2 output is to mark the source exposed before cloning:

```ts
if (reset) { mapAccess.set(this.defaultMap, 'exposed'); this.map = deepClone(this.defaultMap); }
...
mapAccess.set(this.map, 'exposed'); this.map = deepClone(this.map);
```

The cost is that the first `setData` from any instance disables the index for sibling instances. That only matters if `deepClone` actually reads inherited keys.

## Maintainability nits (non-blocking)

1. **Hoist `const map = this.map` in the speculative block.** `state` was fetched for one map, but `privateValue(this.map, state, …)` re-reads the field every iteration. Nothing can change it there today, but pairing them lexically makes the invariant obvious and survives future edits.
2. **Name the private-state predicate.** `typeof mapAccess.get(this.map) === 'object'` appears three times and depends on `'exposed'` being a string and `null` never being stored. An `isPrivate(map)` helper, or `state !== undefined && state !== 'exposed'` as in `readMap`, reads better.
3. **Capture `Object.create`, or use `{ __proto__: null }`, for the page directory.** It's the only uncaptured intrinsic in `privateValue`. It doesn't receive the map, so this is consistency only. `registerDefaultMap` could also use the captured aliases, though it runs at load time and is fine.
4. **Drop the redundant `g` flag on `NON_ASCII_REGEX`.** `String.prototype.search` saves and restores `lastIndex`, so the flag is harmless but misleading.
5. **Surrogate decoding is written three times.** Leave it if Biome or the bundle-size budget prefers inline code. Otherwise, a tiny `charAt(str, i)` helper would serve the two generic loops.
6. **Biome will reflow the one-line `if (char in this.map) { …; break; }`.** Expect a formatting diff.

## Intrinsic or accepted behaviour (not regressions)

- **Inherited data properties expose the map permanently.** An inherited *data* property on a non-own key (e.g. a polyfill setting `Object.prototype['é']`) marks the shared map exposed for every instance. That's conservative and only costs performance.
- **Post-load patching of `WeakMap.prototype.get/set/has`.** These receive the original map as an argument, so a patch could retain it without exposure. This is the same class as patching `String.prototype.slice`/`charCodeAt` in baseline, and the prior private-map fallback had the same WeakMap dependency. Your "post-load monkeypatch" claim should be worded to cover only the captured `getOwnPropertyDescriptor`/`hasOwn`/`setPrototypeOf`, not every intrinsic.
- **`RegExp.prototype[Symbol.search]` patching** affects the ASCII shortcut. It equally affects baseline `hasChinese` and similar helpers.

## Complexity

It's acceptable for what it buys. There are three bounded pieces: a monotonic state machine, one no-user-code speculative loop, and an unchanged generic loop routed through `readMap`. The `biome-ignore` justification still holds. I wouldn't split it further before the 15-round matrix.