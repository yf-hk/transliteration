# Verdict

The shortcut is correct for the packaged API, with three conditions it relies on. I found no concrete counterexample. Land it together with the classification candidate before any data-layout work.

## Shortcut correctness

For a primitive string with empty conf and `options === undefined`, the old pipeline's extra steps do nothing:
- `String()` returns the same string.
- Calling `formatReplaceOption`/`deepClone` on empty `[]` has no observable effect.
- Empty `ignore[]` gives no ranges.
- `trim` is false.
- `replaceAfter[]` is empty.

Map getters that run during mapping can't change the already-selected defaults, because `defaultOptions` is module-private. The shortcut is only equivalent if these three conditions hold. Each one is checkable:

1. **`codeMapReplace` must treat options as read-only.** The old path passed a fresh snapshot each call. The shortcut passes the shared `defaultOptions`. If `codeMapReplace` caches anything on the options object (a compiled regex, a normalized `unknown`, a spacing flag), that state leaks into later calls. Gate: deep-freeze `defaultOptions` in the test build and run the full parity suite.
2. **The options object's own keys must match.** If the old snapshot was a `{}` built by merging, and the pipeline reads any key that `defaultOptions` lacks as an own property, then prototype pollution behaves differently. For example, `Object.prototype.ignore = [...]` or `Object.prototype.trim = true` could change old-path output but not new-path output, or the reverse. Gate: run parity with `Object.prototype` polluted for every option name, plus slugify's names.
3. **The call signature must match.** If the pipeline passes ignore ranges as a separate argument, the direct call must pass the same empty value. It must not pass `undefined` if `codeMapReplace` branches on that.

Optional extra: the ASCII `search` already returns the index of the first non-ASCII character. Pass it to `codeMapReplace` as a start hint so the string isn't scanned twice. Only do this if the prototype shows that scan costs time.

## Ordering

Land the shortcut and classification first, as separate commits, then re-profile. Both are low-risk and measured (+28%). They also change the profile shares that any layout decision depends on: the mapping share will grow once pipeline and dispatch are cut. Choosing a storage layout from today's profile would mean tuning for the wrong workload.

## The one next experiment: compact private store with one-way lazy materialization

Your numeric-loop result points at a specific cause. The direct numeric loop matched Unidecode on Latin but did not help Cyrillic or Korean, even though it **kept the own-key checks**. So the remaining gap is the guarded property lookup itself, not the loop.

The idea is to keep the default map in a store user code cannot reach. Unreachable means no getters, no inherited keys and no mutation, so no guards are needed.

**Design**
- **Storage:** page tables indexed by `cp >> 8`. Each page is a single joined string plus a `Uint16Array` of offsets, or a string array per page. Run a manual `charCodeAt` loop with a hand-rolled surrogate read, and no regex callback, for non-Han non-ASCII characters.
- **New map state `compact`:**
  - The first exposure (`getData`, `setData`, or anything else that leaks the map) materializes the plain object exactly once and caches it for identity.
  - It then switches state to `private`/live permanently and **drops the compact store**.
  - From then on, the existing native or generic paths run unchanged.
  - The result is never two live copies and never a duplicate cache.
- **`setData` before exposure:** materialize first, then run the existing clone-then-write logic.

**Exactness risks to test explicitly**
- The materialized object must match the current map on all of these:
  - `Reflect.ownKeys` order. Note that `"0"`–`"9"` are index-like keys and enumerate first.
  - Property descriptors.
  - Prototype.
- Calling `getData()` twice must return the same object.
- Transliteration output must be identical across a script that runs: transliterate, then expose, then mutate, then transliterate.

## Falsifiable gates

Use 5 rotated rounds, the same compiler, and the full 542,224-check parity suite.

| Gate | Pass condition |
|---|---|
| Parity | 0 diffs, including key order, descriptors and identity checks, and output before and after exposure |
| Korean and Cyrillic median | ≥15% faster than post-shortcut baseline **and** no slower than Unidecode + 5% |
| Latin, mixed, long | No regression > 2% vs post-shortcut baseline |
| Heap after import (no exposure, post-GC) | ≤ current |
| Heap after materialization (post-GC) | ≤ current + 5%, and the compact store must be collectable (check with a heap snapshot) |
| Materialization time | ≤ current module-init cost of building the map |
| Package gzip size | ≤ current |

**Kill criterion:** if Korean gains less than 15%, abandon storage changes. The bottleneck would then be output assembly (string concatenation or the callback) rather than lookup. The follow-up would be a small experiment on how output is assembled, not a storage redesign.

**Tradeoff to accept explicitly:** the first `getData()` or `setData()` call pays a one-time materialization cost and has slightly different latency. Default users get the fast guard-free path for good. Users who touch the map get today's behavior after that first call.

Send the prototype numbers and I'll do the final review.