# Transliteration: open issues, competitors and mapper performance

Research date: 2026-10-23, Asia/Singapore. Baseline: current `main`, commit `d1be1f35e48911b00377dcf5efd299aa74d50000`, including merged PR #258. The separately benchmarked npm version is 2.6.2. Production source is unchanged by this research; alternative implementations are local experiments.

## Recommendation

Use shared unique strings indexed by numeric pages, calculate Hangul on demand, and materialize the legacy map only when required. Encode IDs compactly for distribution, then use a direct Uint16 table while running. **Fix the processing loop too:** the largest speed gains come from the ASCII/numeric fast paths, avoiding redundant option clones, native replacement when no ignored span exists, and tracking the last emitted character instead of reading the growing output tail.

The measured combined prototype cuts raw full-API browser ESM from **193,536 to 103,018 bytes**, cold incremental heap+external memory from **3.665 to 0.626 MiB**, and median fresh-process import from **68.40 to 27.97 ms**. Gzip improves only **2.5%**, because the current textual mappings already compress well. A separate package-layout experiment reduces the actual local npm tarball from **550,243 to 229,088 bytes (58.4 %)** by sharing the CLI engine and removing embedded source content from source maps.

Start with #154/#155/#14 and the measured Chinese-spacing hot path. Keep locale/reading work separate. #252/#255/#251 are cleanup candidates; #257/#254 need substantive review. See [the independently refreshed tracker review](validation/validation.md) for every issue/PR and primary evidence, including the Bulgarian scheme correction.

## Questions and scope

This report refreshes every open issue and PR, compares representative JavaScript and other ecosystem libraries, measures the current production API, and evaluates alternative mapper representations. The requested optimization researcher was explicitly configured as **Astra at max effort**. Its analysis, generators and parity evidence are in [astra/astra-analysis.md](astra/astra-analysis.md).

Final validation, independent confirmation runs, memory/package experiments and synthesis were completed by **GPT-6 Astra at max effort**, with a second Astra/max researcher validating tracker and comparison claims. The inherited broad benchmark was audited and preserved; an independent longer-warmed confirmation was added. All recommendations below are research results; production source and GitHub state are unchanged.

## Remaining GitHub work

The final API refresh at **2026-10-22 17:44:59 UTC** confirmed **12 open issues and 6 open PRs**, with main still at `d1be1f35`. Full issue bodies/comments and PR metadata are saved in [github-issues.json](github-issues.json), [github-prs.json](github-prs.json) and the independently refreshed [validation snapshot](validation/snapshot-summary.json).

| Issue | User need | Assessment / suggested update |
| --- | --- | --- |
| [#154](https://github.com/yf-hk/transliteration/issues/154) | A benchmark for a function appearing in real application profiles | Add a maintained benchmark suite with warm throughput, startup, package bytes and heap budgets. This research supplies a reproducible starting point. |
| [#155](https://github.com/yf-hk/transliteration/issues/155) | Skip work for ordinary ASCII | Add a guarded printable-ASCII path after preprocessing. Honor custom mappings, replacements, trim and postprocessing. The reported range includes DEL; DEL is not printable ASCII. |
| [#14](https://github.com/yf-hk/transliteration/issues/14) | Separate conversion engine from mapping data | Introduce a compact immutable mapper/provider boundary and opt-in script packs while retaining the existing full and Latin exports. |
| [#250](https://github.com/yf-hk/transliteration/issues/250) | Map output positions back to original text for alignment/search | Add an optional mapping API; track UTF-16/code-point offsets and multi-character replacements deliberately. Keep allocation optional on ordinary calls. |
| [#245](https://github.com/yf-hk/transliteration/issues/245) | Remove implausible Tamil/Indic triple-letter results | Establish a documented scheme and native-reviewed fixtures, then improve language rules/data. Faster storage preserves the same linguistic errors. |
| [#243](https://github.com/yf-hk/transliteration/issues/243) | Pinyin `ü` represented as ASCII `v` | Add an explicit Pinyin convention/profile; avoid changing every language's `u` mapping. |
| [#235](https://github.com/yf-hk/transliteration/issues/235) | Bulgarian/Serbian and other Cyrillic differences | Add locale-specific overrides with authoritative examples; evaluate PR #257. |
| [#101](https://github.com/yf-hk/transliteration/issues/101) | Supplementary CJK characters such as `𠮷` | Extend base-data generation to full Unicode code points and add trusted readings. Custom supplementary mappings already work. |
| [#72](https://github.com/yf-hk/transliteration/issues/72) | Arabic alif should not disappear in ordinary names | Define an Arabic orthographic profile and validate mappings. Vowel recovery is a separate contextual task. |
| [#67](https://github.com/yf-hk/transliteration/issues/67) | Thai output such as Chiang Mai | Requires Thai structural/word processing for useful RTGS results; assess PR #254 with a real corpus. |
| [#65](https://github.com/yf-hk/transliteration/issues/65) | Choose Chinese, Japanese or Korean readings for shared Han characters | Introduce explicit language/reading profiles; use separate contextual engines/data where necessary. A one-character table cannot infer all readings. |
| [#228](https://github.com/yf-hk/transliteration/issues/228) | `μg` should be understood as micrograms | Distinguish Greek mu `μ` from micro sign `µ`. Consider opt-in unit normalization; globally mapping Greek mu to `u` would corrupt Greek transliteration. |

### Open PRs

| PR | Current disposition |
| --- | --- |
| [#252](https://github.com/yf-hk/transliteration/pull/252) `allowedChars` fallback | Its defect is covered by merged #258; reconcile/close with attribution and a cross-link. |
| [#255](https://github.com/yf-hk/transliteration/pull/255) Latin bundle isolation | Historical defect already fixed in published 2.6.2; compare against current injected-map architecture before closing as superseded. |
| [#257](https://github.com/yf-hk/transliteration/pull/257) Bulgarian | Requires rebase and changes: logical-OR lookup would lose silent mappings, and its `Balgaria` fixture conflicts with the official scheme’s `Bulgaria` exception. |
| [#254](https://github.com/yf-hk/transliteration/pull/254) Thai | Relevant to #67; require language-quality and coverage evidence. |
| [#57](https://github.com/yf-hk/transliteration/pull/57) language option | Reconcile its old API design with the current engine/provider boundary. |
| [#251](https://github.com/yf-hk/transliteration/pull/251) README | Its reported CDN failure was addressed by restored globals in 2.6.2. Reconcile/close or retain the namespace form as optional documentation; its old `transl()` expected output also needs correction. |

No GitHub comments, closures, merges or releases are part of this research turn.

## Library comparison

All tested npm dependencies are isolated under `deps/`, with exact versions/integrities in its lockfile and [package-versions.json](package-versions.json). Sizes below are standalone browser ESM bundles produced with the same minifier, target ES2020, gzip level9 and Brotli quality11. They exclude source maps. A dependency tarball's total bytes and a consumer's selected bundle are different measurements.

| Library / measured version | Strengths and differences relevant here | Representative limitations |
| --- | --- | --- |
| Current `transliteration` main / full + Latin | Full synchronous API, before/after replacements, ignored spans, custom maps, configurable slugging; no runtime dependencies | Locale/reading selection and linguistic quality issues above; BMP-only base generator; expensive eager default map and cloning |
| npm `transliteration` 2.6.2 | Published reference for release consumers | Does not contain the five core fixes merged in #258 |
| [AnyAscii](https://github.com/anyascii/anyascii) JS0.3.3 | Broad Unicode/supplementary and emoji coverage; JS eagerly imports page data and lazily splits/caches touched pages; implementations across many languages | Context-free; no built-in slug policy; different Han spacing and Hangul conventions |
| [@sindresorhus/transliterate](https://github.com/sindresorhus/transliterate) 2.3.1 | Smaller transliterator; locale-specific rules and custom replacements | In tested cases Chinese/Korean remain Unicode, so its throughput on these inputs is not successful ASCII conversion |
| [@sindresorhus/slugify](https://github.com/sindresorhus/slugify) 3.0.1 | Slug conveniences including decamelization/counters, selective preservation and Unicode mode through `transliterate:false` | Does not supply CJK readings in these tests; unmatched text can be dropped |
| [slugify](https://github.com/simov/slugify) 1.6.9 | Small, dependency-free, locale overrides, global map extension | CJK/Hangul dropped in the tested examples; tested with `lower:true, strict:true` for a comparable slug policy |
| [slug](https://github.com/Trott/slug) 12.0.1 | Small, locale/maps, RFC3986 policy, fallback slugs | Unsupported CJK can become a base64-derived fallback string; this is not romanization |
| [speakingurl](https://github.com/pid/speakingurl) 14.0.1 | Many locale/slug controls including word-safe truncation and symbols | Tested Chinese/Hangul become empty; output policies differ |
| [limax](https://github.com/lovell/limax) 4.2.3 | Adds Chinese Pinyin and Japanese kana romanization to slugging; explicit language controls | Larger data bundle; default tone numbers; its Japanese branch converts kana and removes remaining Kanji |
| [unidecode](https://github.com/FGRibreau/node-unidecode) JS1.1.0 | Broad legacy table; lazy loading of Node data pages; ASCII input can bypass replacement work | Old mapping conventions, supplementary limitations, trailing Chinese spaces; no slug policy; BSD wrapper with Perl-licensed mapping files |

### Other ecosystems

- [Python Unidecode](https://pypi.org/project/Unidecode/): broad tables, unknown-character policies and an ASCII-oriented entry point; GPL licensing differs from this MIT module.
- [text-unidecode](https://github.com/kmike/text-unidecode): simpler legacy-table port with Artistic/GPL choices. [python-slugify](https://github.com/un33k/python-slugify) layers slug policies such as Unicode preservation, max length, stopwords and word-boundary handling on a transliterator.
- [Rust deunicode](https://github.com/kornelski/deunicode): compact static tables, per-character/streaming APIs and allocation-aware entry points. Its documentation explicitly describes the limits of one-size-fits-all readings. Native throughput does not include a Node FFI/WASM/service boundary.
- [AnyAscii](https://github.com/anyascii/anyascii) also has Rust, Go, C, Java, Python, PHP, Ruby and other implementations using related mapping data. [go-unidecode](https://github.com/mozillazg/go-unidecode) is another table-based option.
- [ICU transforms](https://unicode-org.github.io/icu/userguide/transforms/general/) offer rule-based/context-sensitive script transforms and composition. Their data/rule framework is a different capability and deployment footprint; this benchmark does not treat an ICU transform as identical to this module's mapping contract.

The installed implementations' exact observed outputs are saved in [outputs-latest.json](outputs-latest.json). These examples establish behavior and coverage differences, not an accuracy score across every language.

## Why the current mapper is expensive

The generator creates page arrays and a direct lookup function, but `codeMapReplace()` reads a character-keyed object. Startup populates that object, including 11,172 Hangul syllables, even though the generator already contains their algorithmic decomposition.

The current full mapper has 42,006 enumerable keys: 30,834 non-Hangul entries plus 11,172 Hangul syllables. There are 1,744 known-empty non-Hangul mappings and only 3,576 distinct non-Hangul output strings, totaling 12,776 ASCII characters. Shared value IDs can remove a large amount of key/hash/object overhead while preserving the same data.

The current options path deep-clones merged options repeatedly. A separate, unreported timing profile of a mixed short-input workload attributes about 25.7% self samples to `codeMapReplace`, 15.2% to `deepClone`, 14.8% to slugify and 8.2% to the custom replacement helper. These percentages describe that profile mix, not every workload. Profiling is excluded from measured runs.

Source-level duplication does not prove two copies remain after GC: unused lookup code can be tree-shaken and page arrays may become unreachable. Retained memory is measured from built artifacts rather than inferred from source alone.

## Measurement protocol and evidence

See [CLAIMS.md](CLAIMS.md) for the claims written before timing, [protocol.json](protocol.json) for warmup/calibration settings, and [workloads.mjs](workloads.mjs) for every input.

- Primary runtime: Node 22.23.2, production minified bundles, one API process at a time.
- Five fresh-worker runs per implementation/workload, rotated ordering. Calibration and initial warmup are outside the timed section; outputs are consumed and checked.
- Seven workloads: ASCII, accented Latin, Cyrillic, Chinese/mixed-script boundaries, Korean, other mixed scripts, and long mixed text. There are eight strings per workload.
- Shared Intel Xeon E5-2698 v4 host, 64 logical CPUs, macOS15.7.5. Other users' workloads remain running. Initial load averages were11.39/9.34/7.04 and increased during the run; interpret small differences against the observed ranges.
- Full prototype API parity: **1,864,370 assertions** across fourteen variants, including every BMP character through transliterate and slugify, unknown/empty mappings, configuration, replacement/ignore behavior, supplementary overrides, live default sharing, mutation/detachment and resets. Mapper-only parity separately checks all65,536 BMP lookups and all42,006 enumerable keys.
- Throughput medians/ranges, CPU time, iteration counts, checksums, and errors are retained in raw JSON. Empty output is explicitly recorded and must not be ranked as successful transliteration.

<!-- MEASURED RESULTS START -->

## Confirmed full-API speed

Node 22.23.2; each cell is **median [minimum–maximum] calls/s from five interleaved runs**. Every job had at least300 ms warmup, calibration outside timing and a 500 ms timed target. A process was retained per implementation, with only one active timing worker. “Combined” is `packed12-linear-spacing`; its output matches current main. Ranges remain broad on the shared host, so these are workload-specific observations.

| API | Workload | Current main | Combined prototype | Median ratio |
|---|---|---:|---:|---:|
| transliterate | ascii | 166,728 [159,018–206,533] | 2,239,672 [2,031,042–4,695,083] | 13.43× |
| transliterate | latin | 211,632 [164,173–291,508] | 431,655 [421,555–615,144] | 2.04× |
| transliterate | cyrillic | 124,193 [122,933–181,769] | 410,315 [347,816–619,437] | 3.30× |
| transliterate | chinese | 103,958 [90,437–132,703] | 152,440 [140,127–165,890] | 1.47× |
| transliterate | korean | 194,083 [143,538–257,196] | 563,492 [437,608–606,935] | 2.90× |
| transliterate | mixed | 104,990 [78,375–120,572] | 146,907 [132,274–158,546] | 1.40× |
| transliterate | long | 162 [63–213] | 549 [519–582] | 3.39× |
| slugify | ascii | 52,892 [51,661–69,880] | 136,066 [114,148–163,679] | 2.57× |
| slugify | latin | 65,230 [60,133–94,141] | 123,423 [94,501–146,496] | 1.89× |
| slugify | cyrillic | 59,768 [48,760–77,927] | 107,285 [99,461–125,147] | 1.80× |
| slugify | chinese | 38,030 [33,820–54,644] | 62,399 [57,455–74,406] | 1.64× |
| slugify | korean | 53,534 [46,796–89,919] | 106,648 [94,339–126,797] | 1.99× |
| slugify | mixed | 39,092 [34,525–56,970] | 63,573 [60,596–68,252] | 1.63× |
| slugify | long | 141 [60–187] | 460 [439–506] | 3.27× |

Packing alone is not a general speed fix. The packed12-only prototype’s Chinese median was112,215 calls/s versus103,958 current, with overlapping ranges; mixed text was similarly inconclusive, and long-text results varied heavily. Its lookup body is identical to the ordinary-base64 unique-value variant, so transport encoding cannot explain a warmed algorithmic speedup. The large combined gains have distinct mechanisms: ASCII can return after preprocessing, numeric scanning avoids per-character surrogate regex work on eligible inputs, and options/replacement processing does less repeated work.

### Growing-output tail reads

The current Chinese-spacing branch calls `result.slice(-1)` after repeatedly appending to `result`. The controlled prototype replaces that read with the last character of the newly emitted fragment. V8’s substring/single-character path can flatten a concatenated string; its runtime character lookup explicitly calls `String::Flatten`. The source mechanism, isolated patch and following scaling experiment support avoiding repeated growing-string work. This is not a claim that every JavaScript engine follows the same allocation path. [Current loop](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/src/common/transliterate.ts#L111-L136), [Node 22.23.2 substring path](https://github.com/nodejs/node/blob/v22.23.2/deps/v8/src/builtins/builtins-string-gen.cc#L1796-L1899), [runtime flattening](https://github.com/nodejs/node/blob/v22.23.2/deps/v8/src/runtime/runtime-strings.cc#L193-L208).

| Chinese input length | Current median chars/s | Same optimized engine before tail change | After tail change |
|---|---:|---:|---:|
| 192 | 1,355,486 | 1,574,213 | 2,615,557 |
| 768 | 1,037,842 | 459,584 | 2,586,086 |
| 3,072 | 504,542 | 420,889 | 2,817,238 |
| 12,288 | 182,086 | 136,362 | 2,588,165 |

The final path stays near 2.6–2.8M characters/s across a 64× input-length increase. At12,288 characters it is about 14.2× current main on this repeated-Chinese fixture. Separate CPU profiles still put the mapping/spacing loop and Unicode classification on the critical path; the current long-text profile also spends a material fraction in garbage collection. Profiles are diagnostic and excluded from throughput measurements. [Scaling raw runs](confirmation-scaling.json), [current profile](profiles/long-current.cpuprofile), [optimized profile](profiles/long-optimized.cpuprofile).

## Mapper formats, startup and memory

All browser sizes are complete experimental API ESM bundles, minified for ES2020; compression is gzip level 9/Brotli quality 11, excluding maps. Prototype bundles retain research metadata, so these are conservative experimental artifacts rather than a published release budget. Memory is **incremental post-GC heapUsed+external**, not total process RSS. ArrayBuffer bytes are included in external and are not added again.

| Variant | Browser raw bytes | gzip bytes | Brotli bytes | Cold heap+external MiB |
|---|---:|---:|---:|---:|
| Current main | 193,536 | 53,240 | 44,125 | 3.665 |
| pages | 194,712 | 53,526 | 44,390 | 0.784 |
| pooled-offsets | 124,324 | 66,304 | 57,981 | 0.564 |
| pooled-values | 125,435 | 60,960 | 53,072 | — |
| pooled-blocks | 122,662 | 62,277 | 53,928 | — |
| packed12-values | 102,352 | 51,605 | 43,550 | 0.624 |
| packed12-linear-spacing | 103,018 | 51,887 | 43,789 | 0.626 |
| packed12-lean-custom | 103,136 | 51,918 | 43,831 | — |

Ordinary base64 numeric tables make raw JS smaller but **make gzip/Brotli larger** here. The 12-bit ID transport avoids most of that penalty. It has only 519 spare unique-value IDs before exceeding4095; production generation must check bounds and select a wider codec when needed. Numeric assignment in both prototype decoders is endian-independent and needs neither Buffer nor atob. The current base data is BMP-only; future supplementary coverage must use full code points and up to 4352 page-index slots. Supplementary custom mappings already remain supported.

| Variant | Import ms, median [range] | Cold heap+external MiB, median [range] | Warm heap+external MiB, median [range] |
|---|---:|---:|---:|
| current-full | 68.40 [64.90–118.97] | 3.665 [3.665–3.665] | 3.768 [3.768–3.768] |
| current-latin | 16.45 [14.27–30.11] | 0.400 [0.400–0.401] | 0.499 [0.498–0.503] |
| prototype-pages | 34.97 [31.59–47.70] | 0.784 [0.784–0.816] | 0.898 [0.896–0.902] |
| prototype-pooled-offsets | 24.64 [22.65–27.05] | 0.564 [0.564–0.564] | 0.681 [0.676–0.681] |
| prototype-pooled-offsets-memo | 25.05 [21.76–33.42] | 0.592 [0.592–0.592] | 0.711 [0.711–0.711] |
| prototype-packed12-values | 28.57 [24.28–33.45] | 0.624 [0.624–0.624] | 0.740 [0.735–0.740] |
| prototype-packed12-linear-spacing | 27.97 [26.41–28.91] | 0.626 [0.626–0.626] | 0.735 [0.735–0.735] |
| any-ascii | 9.39 [8.62–12.86] | 0.612 [0.612–0.612] | 1.346 [1.346–1.346] |
| sindre-transliterate | 34.49 [30.43–39.24] | 0.869 [0.869–0.869] | 0.909 [0.909–0.909] |
| unidecode | 9.80 [8.91–11.08] | 0.209 [0.206–0.209] | 0.613 [0.578–0.617] |
| limax | 84.84 [67.62–104.01] | 4.076 [4.076–4.076] | 8.751 [8.751–8.751] |

Import uses a fresh Node process/module cache; the OS file cache is not flushed. Cold memory is captured before the first API call. Warm state follows200 mixed-workload passes. The pooled-offset representation has lower idle string storage, but slices2–12-character outputs into new strings on Node 22.23.2; memoization avoids repeated slicing while retaining a cache. Memoization saved only a small amount versus direct values on this warm workload and adds state. Finer32-entry block deduplication saves only 2112 numeric bytes and worsens compressed payload. The 399-prefix Hangul experiment is preserved, but its Korean timing overlaps the direct algorithm’s range; there is insufficient evidence to add that complexity by default. [Mapper analysis](astra/astra-analysis.md), [memory runs](memory-astra.json), [all size measurements](prototype-sizes.json).

### Legacy map exposure and customization

`setData()` returns a live, enumerable42,006-key map. Initially it is shared between transliterate and slugify; reset and customization detach copies. That API prevents an invisible replacement with only a sparse override object. The refined prototype materializes directly into the shared map when exposed, and creates only a private map when customization happens first. It passed133,826 API assertions, including the previously unexposed custom/reset paths.

| Variant | First operation | Operation ms, median [range] | Retained incremental heap+external MiB afterward |
|---|---|---:|---:|
| current-full | setData() | 0.14 [0.09–0.22] | 3.708 [3.708–3.708] |
| current-full | setData({x:"X"}) | 24.39 [19.22–33.44] | 5.216 [5.216–5.216] |
| prototype-packed12-linear-spacing | setData() | 80.20 [78.39–84.21] | 3.389 [3.389–3.389] |
| prototype-packed12-linear-spacing | setData({x:"X"}) | 126.52 [108.50–191.32] | 4.897 [4.897–4.897] |
| prototype-packed12-lean-custom | setData() | 57.78 [51.25–66.04] | 3.390 [3.390–3.390] |
| prototype-packed12-lean-custom | setData({x:"X"}) | 53.46 [42.34–66.04] | 3.390 [3.390–3.390] |

The refinement cuts retained memory after first customization from about 5.47 MB current to 3.55 MB, rather than 5.13 MB with the initial bridge. Its first custom operation remains slower than current because it now creates the previously deferred base dictionary. The default-path throughput table measures the earlier combined prototype; the final refinement only changes materialization, and was verified separately for semantics, memory and operation latency. A new void-returning override API could stay sparse, but changing existing setData semantics would be a public API change.

## JavaScript library throughput and output coverage

The broad comparison has 1050 measurements, five per library/API/workload including experimental formats. The following tables show median calls/s for shipped APIs/configurations; full ranges, CPU time, checksums, errors and all seven workloads are in [throughput.csv](throughput.csv) and [summary.json](summary.json). The independent [output audit](outputs-astra.json) confirms all eight ASCII control outputs match current main for the supported API. Other scripts often differ in spacing, casing, coverage and linguistic rules, so these columns are not a universal quality ranking.

### transliterate

| Library/configuration | ASCII | Latin | Chinese | Korean | Browser gzip KiB |
|---|---:|---:|---:|---:|---:|
| current-full | 157,631 | 217,440 | 88,139 | 207,796 | 52.0 |
| current-latin | 187,313 | 236,125 | Not a reading¹ | Not a reading¹ | 6.1 |
| published-full | 158,626 | 204,732 | 140,556 | 179,799 | 52.3 |
| any-ascii | 633,087 | 859,291 | 1,357,281 | 1,323,307 | 210.4 |
| sindre-transliterate | 417,736 | 283,077 | Not a reading¹ | Not a reading¹ | 8.2 |
| unidecode | 1,730,703 | 790,064 | 397,085 | 307,975 | 77.3 |
### slugify

| Library/configuration | ASCII | Latin | Chinese | Korean | Browser gzip KiB |
|---|---:|---:|---:|---:|---:|
| current-full | 54,751 | 69,443 | 35,983 | 64,104 | 52.0 |
| published-full | 53,349 | 55,024 | 48,542 | 47,167 | 52.3 |
| simov-slugify | 83,140 | 131,560 | Not a reading¹ | Not a reading¹ | 3.7 |
| slug | 28,970 | 39,047 | Not a reading¹ | Not a reading¹ | 3.7 |
| speakingurl | 26,025 | 31,805 | Not a reading¹ | Not a reading¹ | 6.3 |
| limax | 17,922 | 26,659 | 5,507 | Not a reading¹ | 156.3 |
| sindre-slugify | 67,048 | 82,216 | Not a reading¹ | Not a reading¹ | 9.0 |

¹ These configurations drop the script, retain Unicode, or generate a fallback instead of the requested reading. They were timed and remain in the raw data, but their speed is not ranked as successful CJK/Hangul romanization. Limax supplies Chinese Pinyin with default tone numbers and a different Japanese policy. AnyAscii is much faster on the observed mapping-only CJK workloads and covers more Unicode, while its selected browser bundle is about 4× current full gzip size and it lacks this package’s slug/options contract. Node Unidecode is smaller in scope/API and uses older conventions, including trailing Han spaces. The current main/published difference also includes deliberate output fixes; do not infer a pure implementation regression from those two rows alone.

## Other ecosystems: measured separately

Python 3.13.14 used Unidecode 1.4.0, text-unidecode 1.3, AnyAscii 0.3.3 and python-slugify 9.1.3 with its installed default backend configuration. Rust 1.97.0 used deunicode 1.6.2 and any_ascii 0.3.3, compiled with optimization level 3, LTO and one codegen unit. Five interleaved runs used the same eight-input groups, a 120 ms target, consumed outputs and stability checks. These are in-process function calls: **Rust figures exclude Node FFI/WASM, string transfer and service overhead** and do not establish a drop-in Node speedup. Different output conventions still apply.

| Function | ASCII calls/s, median [range] | Chinese calls/s, median [range] | Korean calls/s, median [range] |
|---|---:|---:|---:|
| python-unidecode | 2,121,315 [2,016,894–2,232,279] | 130,239 [122,784–157,588] | 126,296 [104,724–136,809] |
| python-text-unidecode | 203,740 [162,252–223,018] | 311,385 [277,524–323,371] | 267,431 [182,161–297,927] |
| python-anyascii | 2,611,759 [2,549,534–2,640,062] | 217,156 [199,585–259,874] | 198,363 [149,539–225,778] |
| python-slugify | 67,631 [56,101–81,562] | 32,144 [27,667–41,287] | 25,803 [21,156–32,828] |
| rust-deunicode | 8,343,723 [8,033,355–8,620,422] | 2,406,922 [2,331,497–2,512,020] | 3,571,411 [3,416,398–3,743,324] |
| rust-anyascii | 2,089,765 [1,909,872–2,288,909] | 1,792,198 [1,536,438–1,869,267] | 1,837,304 [1,770,212–1,901,450] |

Python-slugify9.x supports explicit backends and modern/legacy modes; this is the named installed default, not a claim that all modes have equal behavior or speed. Installed licenses and backend dependencies differ; Node Unidecode’s mapping-data license also differs from its wrapper. See the [validated comparison](validation/validation.md), [Python versions](python/versions.json), [Rust lockfile](rust/Cargo.lock), [Python runs](python-benchmark.json), and [Rust runs](rust-benchmark.json). ICU and Go alternatives were source-compared, not benchmarked.

## Actual package footprint

The npm package experiment changes packaging only and uses the current algorithm/data. It externalizes both CLI imports to the already-shipped Node entry and removes `sourcesContent` from source maps while retaining source names/location mappings. Eight CLI comparisons (including help and multilingual input) match current output. Removing embedded source content reduces offline debugger source availability, so this is a packaging/debugging tradeoff. No production packaging file was edited.

| Artifact | gzip tarball bytes | Unpacked bytes |
|---|---:|---:|
| Current main, local npm pack | 550,243 | 2,597,355 |
| Shared CLI + maps without embedded source | 229,088 | 1,280,068 |

Embedded source content removal accounts for 929,281 uncompressed bytes. This tarball experiment does not yet include the compact mapper; its58.4% reduction must not be added arithmetically to the mapper’s bundle reduction.

| Published package | Version | Download tarball bytes | Own installed bytes | Runtime dependency tree bytes |
|---|---|---:|---:|---:|
| transliteration | 2.6.2 | 534,980 | 2,454,138 | 2,454,138 |
| any-ascii | 0.3.3 | 219,975 | 552,792 | 552,792 |
| @sindresorhus/transliterate | 2.3.1 | 13,345 | 43,298 | 43,298 |
| unidecode | 1.1.0 | 96,416 | 414,769 | 414,769 |
| slugify | 1.6.9 | 7,260 | 16,225 | 16,225 |
| slug | 12.0.1 | 12,470 | 33,810 | 33,810 |
| speakingurl | 14.0.1 | 35,644 | 167,059 | 167,059 |
| limax | 4.2.3 | 10,202 | 29,148 | 1,178,122 |
| @sindresorhus/slugify | 3.0.1 | 5,759 | 19,168 | 66,125 |

Download bytes above are individual registry package tarballs; transitive tarballs are not silently included. Installed dependency-tree bytes include resolved runtime dependencies once. Selected browser bundles, installed trees and npm tarballs answer different size questions. [Full package evidence and registry URLs](package-sizes.json), [staged package experiment](package-experiments/lean-stage/package.json).

## Delivery plan and limits

1. Preserve the completed parity fixtures and adopt the guarded ASCII/numeric paths, reduced cloning, no-ignore native replacement, and last-emitted-character state. Ship each as a separately reviewable change.
2. Replace eager object construction with a provider using compact unique values and algorithmic Hangul. Choose direct pages for the simplest migration or12-bit transport plus Uint16 lookup for the smaller raw source/heap result. Keep missing and empty distinct and retain separate Latin data injection.
3. Use the refined lazy map materialization for existing setData. Document its first-use cost. Add a separate sparse-override API only as an explicit API design.
4. Share CLI code/data through the installed Node entry; decide whether embedded source-map content is needed. Measure the final combined npm package rather than adding separate savings.
5. Keep language-profile/coverage work and tracker cleanup in the roadmap described above. Faster lookup preserves current mapping quality.

No production implementation, release, PR merge or tracker mutation was requested or performed. Browser/React Native runtime performance and an integrated release tarball containing every optimization remain unmeasured. Shared-host variation limits fine rankings; use the recorded ranges, not just medians. The tests cover the documented string-valued options/maps and existing edge cases, not every possible monkey-patched JavaScript environment.

## Reproduction and evidence

Run commands from `repo/research/2026-10-23-performance` with Node 22.23.2 for the measured JavaScript runtime. Install comparison dependencies with `npm ci --ignore-scripts --prefix deps`; build current production artifacts once before timing. Serialize all timing, profiling, compression and compilation.

```sh
node astra/generate-variants.cjs
node astra/generate-followups.cjs
node astra/verify-variants.cjs
node astra/verify-variants.cjs followup-manifest.json followup-correctness.json
node build-prototypes.mjs
node verify-prototypes.mjs
node run.mjs benchmark
node confirm.mjs finalists
node confirm.mjs scaling
node memory-astra.mjs
node memory-scenarios.mjs
MEMORY_IDS=prototype-packed12-lean-custom MEMORY_OUTPUT=memory-scenarios-lean.json node memory-scenarios.mjs
node measure-artifacts.mjs
node audit-outputs.mjs
node run-cross-language.mjs python
cargo build --release --locked --manifest-path rust/Cargo.toml
node run-cross-language.mjs rust
node summarize.mjs
node write-results.mjs
```

The preserved broad snapshot is `benchmark-1792686766141.json`; later scripts do not overwrite it. The exact archived artifacts/counts may differ from a rerun of the evolving research harness (for example, it now contains the additional custom-before-exposure cases and final prototype). `summary.json` and `throughput.csv` are generated from the archived result files. Additional evidence: [claims before timing](CLAIMS.md), [full API parity](prototype-api-parity.json), [follow-up parity](prototype-followup-parity.json), [custom-map refinement parity](prototype-lean-parity.json), [Astra mapper analysis](astra/astra-analysis.md), [validated tracker snapshot](validation/snapshot-summary.json).

Recorded Graft estimates total approximately **1,201,725 tokens saved** across the parent and two Astra researchers (24,436+110,708+1,066,581). One additional child output was truncated and is excluded. These are tool estimates, not measured model-token savings.
