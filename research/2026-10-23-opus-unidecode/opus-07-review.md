**Judgment:** This is the right final variant. It gives up dense-page warm reads to get lazy population, so cold cost scales with new characters, not touched pages. I see no API-level hole in the design as stated. There are four implementation footguns and a few tests your list doesn't cover.

**Concrete holes to close**

1. **Hit sentinel vs. offset 0.** You say a page hit "returns a string (including '')" but also that the page stores "one numeric offset". Pick one representation per slot.
   - If slots hold offsets into a private value array, the hit test must be `slot !== undefined`, not truthiness. Offset `0` and value `''` both fail a truthiness check, and the bug would read as a silent miss/re-cache loop.
   - Mixing numbers and strings in one page also moves it from HOLEY_SMI to HOLEY_ELEMENTS. Measure the representation you ship.
2. **Descriptor own-check must use captured intrinsics.** If the check is `'value' in desc` or `desc.value !== undefined`, a polluted `Object.prototype.value` makes accessor descriptors look like data.
   - Use a captured `Object.hasOwn` (or `hasOwnProperty.call`) on the descriptor.
   - Capture `getOwnPropertyDescriptor`, `hasOwn` and `setPrototypeOf` at module init. Otherwise a post-load monkeypatch of `Object.getOwnPropertyDescriptor` becomes an observable call on every miss, which the baseline never made.
3. **Reentrancy must re-read the index handle.** The miss path runs user getters. A getter can expose the map, write config, or trigger invalidation. After any return from the generic path, re-fetch the page/directory from the WeakMap; never use a local captured before the call.
4. **Sparse first store.** Writing `page[200]` on an empty literal stays fast-holey in current V8, since the gap is under its dictionary threshold. Verify this with `%DebugPrint` once, because a page silently in dictionary-elements mode would invalidate the warm numbers.

**Required tests beyond your list**

- **Offset/empty boundary:** the first cached entry (offset 0) and an entry whose value is `''` both hit on second use and are not re-read. Count descriptor calls via a test-only hook, not a monkeypatch.
- **Stale-after-write:** cache a char, then for each internal write path (set, replace, delete-to-unknown, reset) the next read reflects the new state, including deletion falling through to unknown-string handling.
- **Exposure is one-way:** expose, re-set the same map identity, and confirm it never re-indexes. The user may still hold the reference.
- **Mid-call invalidation:** a getter on char N exposes and mutates the map. Chars N+1… in the *same* call see the mutation, and earlier cached chars in the same call are not reused.
- **Lone surrogates:** high at end, low alone, high+non-low, and a lone `0xD800` adjacent to an astral codepoint whose page index differs. Assert no key collision between code-unit and codepoint indexing.
- **Prototype index pollution after load:** `Array.prototype[k]` and `Object.prototype[k]` getters/setters for k in page range and for the page index in the directory. Assert zero calls on hit and on populate.
- **Memory bound:** feed a large random-unknown corpus spanning all planes and assert the directory key count stays at or below the known-page count. Add a heap delta under a fixed threshold.
- **Getter exactly-once across time:** a miss on X, then a getter added for X, then 3 uses of X gives 3 getter calls and 0 cached entries for X.

**Tradeoffs to report honestly**

- **Warm path:** each warm hit now pays a hole check against a null-prototype HOLEY array, plus an indirection if you use offsets. That can regress against the dense variant, especially on Korean, where per-char page density is high. Report it against both baseline and the dense variant, not only baseline.
- **Cold path:** first use now costs one descriptor allocation per new char rather than 256 per page. For Korean that is fewer reads but more distinct allocation events. Report first-use with the same corpus and timing method as the 3.02 ms / 1.00 ms numbers.
- **Heap:** heap should shrink versus +160 KiB because pages fill sparsely. But a holey array is still 256 slots once its high index is touched, so page count, not char count, bounds it.
- **Typed-array pages:** `Int32Array(256)` with -1 means "not cached", not "known missing", so it is not a negative cache. It avoids the prototype/hole question entirely but costs 1 KiB per page. Consider it only if HOLEY measures badly; don't add it to this round.

**Selection rule I'd use:** accept if first-use is within noise of baseline, warm stays at or above the dense variant's lower interval bound, parity stays 8/8, and every listed test passes. Otherwise keep the generic path. Don't claim a win until those measurements are in.