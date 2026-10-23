**Verdict:** This is a worthwhile, low-risk candidate. The equivalence argument holds for the guarded case: maximal runs of `[disallowed ∪ '-']` collapse to one `-`, which is exactly what sanitize-then-collapse produces when `allowedChars` contains `-` (in `0-9-_`, the second `-` is a literal) and nothing is ignored. The guard itself is where the risk lies.

**Challenges**

1. **`??` creates a divergence.** If `opt` is merged, explicit `{allowedChars: undefined}` or `null` takes the fast path. The old code may build `[^undefined]+` or `[^null]+`. Either make the guard `opt.allowedChars === DEFAULT_ALLOWED_CHARS` or prove the old code also applied `??`.
2. **`!opt.ignore?.length` lets non-arrays through.** `{}`, `''`, `0` and `{length: 0}` take the fast path. Confirm the old code treats each of them as "no ignore". If not, use `Array.isArray(opt.ignore) && opt.ignore.length === 0` or the old falsy check, exactly mirrored.
3. **Pipeline order.** Verify that nothing runs between transliteration and sanitization in the old body. Check `replaceAfter`, `trim`, `fixChineseSpacing` and any case transform. If lowercasing ever preceded sanitizing, U+212A (Kelvin) → `k` would diverge.
4. **The edge trim does more work than needed.** After the collapse, at most one `-` can sit at each edge. Two `charCodeAt(…) === 45` checks with `slice` would beat `/^-+|-+$/g`. Benchmark both.

**Gate cases (differential vs. old body, same options)**

- **Strings:** `''`, `'-'`, `'---'`, `'--a--b--'`, `'a-_-b'`, `'._~'`, `'a - b'`, `' a '`, `'a\u2010b'`, `'a\u00A0b'`, `'\uD800x'`, `'x\uDC00'`, `'😀a😀'`, `'İ'`, `'ß'`
- **Mapping:** `{replace: {a: '-'}}` and `{replace: [['b', ' - ']]}`, `unknown: '-'`, `unknown: '?'`
- **Guard edges:** `separator` set to explicit `'-'`, `undefined`, `null` and `'--'`. `allowedChars` set to `undefined`, `null`, the default string built dynamically (value equality), and `'a-z-'`. `ignore` set to `[]`, `['']`, `{}`, `''`, `'-'`.
- **Flags:** `lowercase`/`uppercase` combined with each of the above
- **Stress:** run the property fuzzer biased toward `-`, `_.~`, whitespace and lone surrogates

**Performance gate**

- Report the per-call share before and after on short ASCII, short Latin and long mixed inputs, with the guard included.
- Non-default options must show no regression.
- If the old path compiled `new RegExp` per call, most of the win is that compilation. Say so, so the gap to 133.7k/s is attributed honestly; the remaining gap is likely in `transliterateWithOptions`.
- Accept only if the five-run medians beat the confidence interval on both ASCII and Latin.
