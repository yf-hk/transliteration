# Benchmark results

Before is the published **2.6.2** release. After is **next (unreleased)**; the working manifest is still 2.6.2. All JavaScript columns were rotated together. Python/Rust/ICU are separately timestamped synchronous resident-process string throughput; startup, IPC, bridge and network costs are excluded. Different runtimes include different string/result-consumption overhead.

| API / test | Before 2.6.2 k/s | After next k/s | Median gain |
| --- | ---: | ---: | ---: |
| transliterate / ascii | 237.6 (216.9–270.5) | 4,129.2 (3,621.9–4,345.6) | **17.38×** |
| transliterate / latin | 309.4 (256.9–345.0) | 962.4 (888.6–1,203.0) | **3.11×** |
| slugify / ascii | 78.8 (58.7–97.7) | 630.7 (495.0–749.4) | **8.00×** |
| slugify / latin | 77.8 (69.2–88.9) | 554.1 (372.8–641.4) | **7.13×** |

Thousands of complete strings/second; 5 rotated samples. **🏆** = highest eligible observed median; **≈** = overlapping ranges, so superiority is inconclusive. **†** = ineligible reading (dropped/retained/fallback text or failed reading probe). **‡** = limited reading probe passed, but complete outputs differ from After Full. A probe does not validate every pronunciation. No winner is awarded when every library fails a reading probe.

### Transliteration

| Test | Before Full 2.6.2 | After Full next (unreleased) | After Latin next (unreleased) | AnyAscii JS 0.3.3 | Unidecode JS 1.1.0 | Sindre transliterate 2.3.1 | pinyin-pro 3.29.5 | Unidecode Py 1.4.0 | text-unidecode Py 1.3 | AnyAscii Py 0.3.3 | deunicode Rust 1.6.2 | AnyAscii Rust 0.3.3 | ICU C++ 78.3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ascii | 237.6 | 4,129.2 | 4,082.6 | 834.6 | 2,366.6 | 517.8 | 72.5 | 1,757.6 | 216.2 | 2,039.9 | **🏆 8,261.2** | 2,131.0 | 51.6 |
| latin | 309.4 | 962.4 | 869.9 | 1,245.9 | 929.4 | 417.1‡ | 106.9† | 140.6 | 304.4 | 284.6 | 2,424.3 | **🏆 2,827.3** | 70.0 |
| cyrillic | 164.0 | 519.8 | 183.7† | 781.9‡ | 223.7‡ | 150.8† | 93.1† | 72.1‡ | 160.7‡ | 98.5‡ | **🏆 2,108.2‡** | 1,493.2‡ | 38.0‡ |
| chinese | 202.9‡ | 430.6 | 393.5† | 1,753.7‡ | 555.2‡ | 637.3† | 39.0‡ | 157.4‡ | 381.6‡ | 265.2‡ | **🏆 2,238.5‡**≈ | 1,535.8‡ | 3.9‡ |
| japanese | 244.2† | 466.6† | 433.4† | 2,085.2† | 621.6† | 675.3† | 100.0† | 185.3† | 442.5† | 305.5† | 3,805.9† | 2,301.2† | 9.6† |
| korean | 279.4 | 823.1 | 379.2† | 1,572.1‡ | 418.0 | 275.6† | 133.6† | 135.6 | 294.5 | 219.6‡ | **🏆 3,219.2** | 1,756.6‡ | 30.1‡ |
| mixed | 182.5† | 278.1† | 240.9† | 1,021.1† | 376.6† | 267.1† | 77.6† | 99.5† | 206.0† | 176.1† | 2,635.0† | 2,141.1† | 15.6† |
| long | 4.2† | 5.2† | 4.5† | 13.9† | 7.0† | 9.5† | 1.4† | 1.7† | 4.0† | 3.2† | 54.0† | 78.4† | 0.3† |

### Slugify

| Test | Before Full 2.6.2 | After Full next (unreleased) | After Latin next (unreleased) | slugify JS 1.6.9 | slug 12.0.1 | speakingurl 14.0.1 | Sindre slugify 3.0.1 | limax 4.2.3 | python-slugify 9.1.3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ascii | 78.8 | 630.7 | **🏆 716.2**≈ | 119.5 | 38.3 | 38.4 | 115.4 | 30.7 | 80.9 |
| latin | 77.8 | 554.1 | **🏆 615.5**≈ | 157.0 | 55.5 | 57.7‡ | 110.7‡ | 42.6‡ | 48.3 |
| cyrillic | 74.3 | **🏆 352.0** | 158.9† | 147.7‡ | 49.9‡ | 50.5‡ | 72.5‡ | 34.4‡ | 33.9‡ |
| chinese | 68.0‡ | **🏆 269.5** | 313.4† | 286.6† | 28.8† | 92.2† | 135.7† | 8.0‡ | 40.4‡ |
| japanese | 97.5† | 341.6† | 433.3† | 362.8† | 37.5† | 130.0† | 141.5† | 80.1† | 54.3† |
| korean | 79.7 | **🏆 516.5** | 290.9† | 234.9† | 19.5† | 77.0† | 102.7† | 53.5† | 33.0 |
| mixed | 85.4† | 249.0† | 209.7† | 146.8† | 26.4† | 45.2† | 91.0† | 20.2† | 31.8† |
| long | 2.8† | 4.9† | 3.2† | 2.9† | 0.6† | 1.0† | 7.0† | 0.6† | 1.1† |

## Protocol and validity

21 configurations, 1040 samples, 137,149,400 completed calls, zero errors/failures. 5 rotated rounds, 250 ms target, 12 ms warmup/calibration; one worker timed at a time. Every sample checks completed calls, consumed output units/checksum and stable complete outputs. These are public string API measurements, not an end-to-end application or universal fastest claim.

Host: Intel(R) Xeon(R) CPU E5-2698 v4 @ 2.20GHz, 64 logical CPUs, darwin/x64; Node v26.5.0. JavaScript phase 2026-10-23T12:52:29.744Z–2026-10-23T12:56:22.301Z, load [8.65234375,8.3203125,8.71435546875]→[9.67724609375,9.1328125,9.0078125]. Cross phase 2026-10-23T12:56:22.301Z–2026-10-23T12:57:46.768Z. Background desktop/database work remained active; no samples were discarded. All ranges and coefficients of variation remain in summary.csv.

Rust uses a locked offline release build with opt3/LTO/one codegen unit and black_box on inputs/results. ICU uses a persistent native C++ converter, Any-Latin; Latin-ASCII, including UTF-8/UTF-16 conversion. Native compilation precedes timing. Python uses pinned packages and its default slugify legacy/auto backend. Dictionary/page/locale-pattern caches are warm; installed slug has no whole-input result cache. No language winner is inferred from deletion, fallback encoding, retained Unicode or a failed reading probe. Japanese Kanji readings fail the probe across these configurations; mixed/long inherit that restriction.

| Configuration | Actual package version | Runtime / options |
| --- | --- | --- |
| After Full next (unreleased) | 2.6.2 | Node v26.5.0; Defaults, full character map |
| After Latin next (unreleased) | 2.6.2 | Node v26.5.0; Defaults, Latin character map |
| Before Full 2.6.2 | 2.6.2 | Node v26.5.0; Published registry release, defaults |
| AnyAscii JS 0.3.3 | 0.3.3 | Node v26.5.0; Defaults |
| Unidecode JS 1.1.0 | 1.1.0 | Node v26.5.0; Defaults |
| Sindre transliterate 2.3.1 | 2.3.1 | Node v26.5.0; Defaults, including normalization |
| pinyin-pro 3.29.5 | 3.29.5 | Node v26.5.0; { toneType: 'none', nonZh: 'consecutive' } |
| slugify JS 1.6.9 | 1.6.9 | Node v26.5.0; { lower: true, strict: true } |
| slug 12.0.1 | 12.0.1 | Node v26.5.0; Defaults, fallback encoding enabled; no whole-input cache |
| speakingurl 14.0.1 | 14.0.1 | Node v26.5.0; Defaults |
| Sindre slugify 3.0.1 | 3.0.1 | Node v26.5.0; Defaults, including decamelization |
| limax 4.2.3 | 4.2.3 | Node v26.5.0; Defaults, language detection and Pinyin tone numbers |
| Pre-optimization full 2.6.2 | 2.6.2 | Node v26.5.0; Immediate pre-optimization frozen distribution, defaults |
| Pre-optimization latin 2.6.2 | 2.6.2 | Node v26.5.0; Immediate pre-optimization frozen distribution, defaults |
| Unidecode Py 1.4.0 | 1.4.0 | Python 3.13.14; Defaults |
| text-unidecode Py 1.3 | 1.3 | Python 3.13.14; Defaults |
| AnyAscii Py 0.3.3 | 0.3.3 | Python 3.13.14; Defaults |
| python-slugify 9.1.3 | 9.1.3 | Python 3.13.14; Default legacy algorithm, auto backend selects installed Unidecode |
| deunicode Rust 1.6.2 | 1.6.2 | rustc 1.97.0 (2d8144b78 2026-07-07) (Homebrew); Release opt3, LTO, codegen-units1 |
| AnyAscii Rust 0.3.3 | 0.3.3 | rustc 1.97.0 (2d8144b78 2026-07-07) (Homebrew); Release opt3, LTO, codegen-units1 |
| ICU C++ 78.3 | 78.3 | ICU C++ 78.3; Any-Latin; Latin-ASCII, persistent native converter, UTF conversion included |

## Startup and memory

Single import/first-call observations exclude process startup and use uncontrolled OS caches. Post-GC warm deltas include saved outputs/JIT/library caches and are not exact library allocations. Cross-runtime startup/memory are unmeasured.

| Configuration | Import ms | First mixed call ms | Warm heap delta MiB | Warm RSS delta MiB |
| --- | ---: | ---: | ---: | ---: |
| After Full next (unreleased) | 76.04 | 2.707 | 4.033 | 33.785 |
| After Latin next (unreleased) | 9.47 | 1.771 | 0.625 | 20.027 |
| Before Full 2.6.2 | 65.43 | 1.587 | 3.806 | 25.734 |
| AnyAscii JS 0.3.3 | 10.34 | 7.386 | 1.892 | 12.254 |
| Unidecode JS 1.1.0 | 3.27 | 13.349 | 1.270 | 20.609 |
| Sindre transliterate 2.3.1 | 30.95 | 2.732 | 1.099 | 12.066 |
| pinyin-pro 3.29.5 | 135.04 | 34.234 | 8.960 | 51.293 |
| slugify JS 1.6.9 | 4.39 | 0.807 | 0.386 | 16.527 |
| slug 12.0.1 | 4.44 | 0.961 | 0.405 | 19.070 |
| speakingurl 14.0.1 | 7.85 | 1.504 | 0.458 | 10.379 |
| Sindre slugify 3.0.1 | 35.13 | 3.964 | 1.176 | 11.199 |
| limax 4.2.3 | 131.49 | 47.301 | 9.513 | 41.000 |
| Pre-optimization full 2.6.2 | 76.17 | 2.037 | 3.858 | 31.863 |
| Pre-optimization latin 2.6.2 | 17.41 | 2.335 | 0.591 | 19.320 |

## Browser artifacts

| File | Raw bytes | Gzip 9 | Brotli 5 |
| --- | ---: | ---: | ---: |
| dist/browser/bundle.umd.min.js | 188440 | 55445 | 55255 |
| dist/browser/bundle.esm.min.js | 188162 | 55305 | 55245 |
| ./dist/browser/latin.esm.min.js | 19388 | 7591 | 6671 |

## Artifact provenance

Previously tested archive: 574965 bytes, SHA256 `6fff5c8a8017c45948255a04478f53bb333933c946a91c7e8502634bdba5e1e4`. Its 16 distribution payload files match the measured code. README generation happens after that archive was packed; this is not a byte-identical archive of the newly edited documentation.

Library source/dist hashes, loaded entries, actual package/runtime/compiler versions and every output/probe/sample are retained in the raw results.json. The compact committed snapshot is RESULTS.md, summary.csv, RESULTS.html and result-summary.json. Detailed timestamped runs remain under ignored results/. Reproduce with the documented TypeScript build/run commands in README.md; before-after.csv in a detailed run includes all paired ranges/output counts, including optional pre-optimization attribution.
