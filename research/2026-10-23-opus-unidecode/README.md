# Unidecode performance investigation and Opus consultation

The selected change adds a lazy numeric index for the built-in character maps, preserves the public API, and keeps zero runtime dependencies. Sol 6.1 implemented and measured the candidates. Claude Opus 5.5 reviewed the alternatives and the selected implementation. No Astra model was used in this continuation.

## Why Unidecode was faster

Unidecode JS 1.1.0 uses native string replacement and a warmed two-level numeric lookup, `tr[code >> 8][code & 255]`. Its source is retained in `../../benchmark/results/2026-10-23-unidecode-stage2-sol61/source-evidence/unidecode-1.1.0.js`. The earlier implementation here used an own-property check and a character-keyed object lookup for each replacement. Han text also requires this library's spacing and character classification rules.

Profiles located most time in mapping, but stripped native symbols prevented a reliable attribution of total time to hashing. The controlled comparison was stronger evidence: a numeric loop alone and a page index with native replacement were broadly neutral; combining the numeric loop and numeric index produced the dense-script gains. The explanation is therefore based on source and measured combinations, not a claimed percentage of time spent hashing.

Some benchmark outputs differ between libraries. Equal-output Latin and Korean fixtures support direct throughput comparisons. Cyrillic, Chinese, Japanese and mixed-text figures require the output and reading markers retained in the benchmark tables. Rust throughput is a separate runtime comparison.

## Selected implementation

- Cache only descriptor-proven own string mappings, including empty strings.
- Populate an entry only when that character is requested. Do not prefill a 256-entry page or cache missing characters.
- Use null-prototype pages and a null-prototype directory so inherited numeric properties cannot affect the index.
- Share ownership state across APIs using the same map. Exposure permanently disables its index and ASCII shortcut.
- Mark a map exposed before an inherited or own getter can receive it, including generic Han/ignore paths and cloning during `setData` or reset.
- Preserve direct live reads for exposed/custom maps, full code points, lone surrogates, unknown replacements, and existing spacing behavior.
- Use measured ASCII classification shortcuts without changing the Unicode fallback.

Customization or reset conservatively disables the index for the source map shared by sibling APIs before cloning. This prevents a clone-time getter from retaining or mutating a supposedly private source map.

## Alternatives rejected

| Candidate | Reason |
| --- | --- |
| Empty-pipeline bypass alone | No repeatable material gain in the controlled run. |
| Numeric iteration with character-keyed lookup | Did not remove the dense-script bottleneck. |
| Eagerly populated numeric pages | Fast when warm, but substantial first-call cost for scattered Korean characters. |
| Existing packed `lookup` used directly | Its missing/empty and prototype behavior does not fully match the actual live map. |
| A native or WASM runtime | Adds packaging and browser complexity; the measured JavaScript change needs no new dependency. |

The selected lazy index still costs memory and first-use work. Final Node bundles add 507 bytes gzipped for Full and 524 bytes for Latin compared with the previous optimized code; the Full browser UMD bundle adds 496 bytes. The representative corpus adds about 234 KiB of post-GC retained heap, including runtime bookkeeping. A worst-case first call containing all 11,172 distinct Hangul syllables took 10.19 ms versus 4.38 ms. These observations are not universal bounds. The final archive is `121ac0724bd0a9090aa0df32ecb83fcaf38f4ccb92043306688d9a770698ee7b`; resource observations are retained in the production report directory.

The final 15-round comparison used identical complete outputs (8/8 per fixture), 135 samples and 23,008,640 completed calls with zero errors. Ratios are geometric means of same-round ratios with fixed-seed percentile bootstrap intervals:

| Test | Full next / Unidecode JS 1.1.0 | Paired 95% interval |
| --- | ---: | ---: |
| ASCII | 1.74× | 1.60–1.88× |
| Latin | 1.24× | 1.11–1.42× |
| Korean | 1.84× | 1.65–2.03× |

Compared with the previous optimized code, this update measures 1.66× for Latin and 2.38× for Korean; ASCII is a tie, 1.00× with interval 0.93–1.07×. These Node 26.5.0 results establish wins for the measured exact-output workloads, not every language, input, runtime or library. The maintained README matrix separately compares the published 2.6.2 release and all configured peers.

## Review record

Attempts `opus-01` and `opus-02` failed authentication and supplied no model review. After sign-in, receipts `opus-03-receipt.json` through `opus-08-receipt.json` each record a successful response from `claude-opus-5-5`. The CLI had tools disabled and received explicit source/evidence. Prompts, text-only reviews and distinct receipts are retained here.

| Review | Contribution and reconciliation |
| --- | --- |
| 03 | Proposed the numeric-loop/index comparison, shared invalidation and warm/cold/resource gates. Native-profile attribution remained a hypothesis. |
| 04 | Proposed a default-pipeline shortcut. Measurement did not justify selecting it alone. The current code already shared default options, correcting one premise in the review. |
| 05 | Required actual-map descriptors rather than the packed lookup. Existing deep-import exports were retained; full-codepoint indexing was already supported. |
| 06 | Checked null-prototype page construction. Dense pages still had excessive representative cold cost. |
| 07 | Reviewed positive-only lazy entries. Slots contain strings, not offsets; missing entries are never cached. |
| 08 | Found no blocker in the supplied index/getter code, and requested verification of cloning. Inherited clone getters were ruled out by the own-key guard; own-accessor cloning was confirmed and fixed by invalidating the source before cloning. |

The final production form extracts the speculative numeric loop into one helper, adds the separately measured ASCII classification changes, and invalidates clone sources. A later broad run exposed a slowdown when dropping unsupported characters. An own-key check alone did not fix it; reusing the already extracted character on misses removed the duplicate construction and resolved the large observed slowdown in the bounded comparison. Cached numeric reads still avoid constructing a character string. The earlier measurements remain separate from the final artifact's measurements.

Sol and the parent reviewed these production changes and validated their resulting artifacts. Opus did not execute the tests or benchmarks.

## Evidence

- Candidate controls, parity checks, profiles and resource observations: `../../benchmark/results/2026-10-23-unidecode-stage2-sol61/`.
- Production patch, acceptance checks and final focused measurements: `../../benchmark/results/2026-10-23-unidecode-production-sol61/`.
- Maintained benchmark results: [benchmark/RESULTS.md](../../benchmark/RESULTS.md).
- Reproduction commands and methodology: [benchmark/README.md](../../benchmark/README.md).

Detailed runs are local evidence under ignored `benchmark/results/`. The maintained benchmark report and compact snapshots are the reviewable repository artifacts. No commit, push, release or CDN publication was performed by this continuation.
