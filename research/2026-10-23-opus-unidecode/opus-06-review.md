**Short answer:** I see no observability hole in the construction itself, provided three invariants hold. It is a justified, bounded fix if the cold breakdown confirms the limiter is on the write side. The cold gate should cover the whole cold corpus *and* a worst-case first call, not one Korean word.

## Observability check

- **`[]` literal.** It uses ArrayCreate with %Array.prototype%. There is no constructor, `Symbol.species` or `length` setter lookup, so nothing is observable.
- **`setPrototypeOf(page, null)` before any store.** This ordering is the whole correctness argument. `page[i] = v` is an ordinary [[Set]]. With no own property, it walks the prototype chain. With a `null` prototype, it reaches nothing and falls through to creating an own data property. If you swapped the order, integer setters on `Array.prototype` or `Object.prototype` would fire during construction.
  - Add one adversarial case explicitly: an `Array.prototype[k]` setter installed before the first call must never fire. Your current "integer prototype setters" suite may only cover `Object.prototype` and the source map.
- **`Object.setPrototypeOf` itself is a live global lookup.** This is the one concrete gap. If user code patches it after load, the candidate makes an observable call that baseline never makes. A throwing patch would also break transliteration. Capture it at module init (`const setProto = Object.setPrototypeOf`). That matches "normal intrinsics assumed at load" without depending on call-time globals. Test it by patching after import.
- **All 256 slots assigned in ascending order.** This keeps the elements PACKED. A skipped slot creates a hole, which is still unobservable because the chain is null, but it degrades to HOLEY and keyed loads get slower. A `--allow-natives-syntax` debug assertion (`%HasHoleyElements`) in a dev-only test is cheap insurance.
- **Undefined slot means "defer".** A source key that is missing, an accessor, or a non-string value must all produce `undefined`, which routes to the unchanged generic path. Parity then rests on the generic path doing the baseline lookup, including any prototype getter invocation, at the same per-character point. Your "new getter after cached miss" scenario covers this; keep it in the final suite.
- **Leakage.** Pages are only safe while private. Confirm no path returns or yields a page, or passes one to a callback.

Nothing here touches the cache lifecycle, exposure invalidation or `setData`, so the existing parity and adversarial results stay valid. Rerun them anyway on the exact build.

## Is it the right fix for the cold limiter?

7.24 ms for 9 pages is about 0.7 ms per page, or roughly 2.5 µs per slot. That is consistent with `defineProperty` on array indices pushing elements into dictionary mode. However, each page also does 256 source-side own-descriptor reads, and you haven't separated those costs.

Before accepting the patch, split cold time into:
1. Source descriptor reads.
2. Page writes.
3. Steady-state lookup.

If (1) is a large share, this variant only partly closes the gap. You would then need a descriptor-read change, which is a separate patch with its own parity run. If (2) dominates, this is exactly the bounded fix. It changes how pages are populated, not what goes in them.

Also re-confirm the warm numbers. A null-prototype array has a distinct map, so warm Cyrillic and Korean results could shift. Check that the interaction effect you measured survives.

## Resource gates

One Korean word isn't enough, but replacing it with the corpus aggregate alone isn't enough either. Gate on both, each in a fresh process per sample with rotated order:

1. **Worst-case first call, per script.** Use an input that touches the maximum number of pages in a single call. For Hangul this means spanning U+AC00–U+D7A3, about 44 pages, which is far more than 9. Gate absolute time, or scale the +0.5 ms budget per page touched, but state which one up front.
2. **Whole cold corpus.** Run all fixture groups in sequence from a fresh process and compare total wall time with baseline. This catches the realistic mixed-script cost.
3. **Break-even calls per script.** Report how many calls it takes to amortize the cold cost, derived from cold minus baseline over warm savings. This turns the cold/warm trade into a number reviewers can judge.

Keep the footprint gate as is, but re-measure. PACKED arrays may retain less than the dictionary-mode pages behind the ~146 KB figure, which would be a favorable change worth recording.

Send the patch and results with the cold breakdown, and I'll do the final review against these invariants.