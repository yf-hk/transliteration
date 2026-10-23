# Benchmark results

Before is the published **2.6.2** release. After Full and After Latin are **2.7.0**, loaded from this checkout's built exports. All libraries are JavaScript and were rotated together on the same Node.js version. Process startup and IPC are excluded from throughput.

| API / test | Before 2.6.2 k/s | After 2.7.0 k/s | Median gain |
| --- | ---: | ---: | ---: |
| transliterate / ascii | 286.0 (251.1–319.1) | 4,206.3 (3,929.8–5,244.4) | **14.71×** |
| transliterate / latin | 326.0 (310.5–379.2) | 1,212.7 (1,087.5–1,413.3) | **3.72×** |
| slugify / ascii | 85.3 (83.3–93.6) | 744.0 (710.7–945.8) | **8.72×** |
| slugify / latin | 103.2 (85.9–138.2) | 625.5 (548.9–718.4) | **6.06×** |

Thousands of complete strings/second; 5 rotated samples. **🏆** = highest eligible observed median; **≈** = overlapping ranges, so superiority is inconclusive. **†** = ineligible reading (dropped/retained/fallback text or failed reading probe). **‡** = limited reading probe passed, but complete outputs differ from After Full. A probe does not validate every pronunciation. No winner is awarded when every library fails a reading probe.

### Transliteration

| Test | Before Full 2.6.2 | After Full 2.7.0 | After Latin 2.7.0 | AnyAscii JS 0.3.3 | Unidecode JS 1.1.0 | Sindre transliterate 2.3.1 | pinyin-pro 3.29.5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ascii | 286.0 | **🏆 4,206.3**≈ | 4,174.6 | 971.6 | 2,432.6 | 514.2 | 95.2 |
| latin | 326.0 | **🏆 1,212.7**≈ | 1,001.1 | 1,178.7 | 964.3 | 384.5‡ | 114.9† |
| cyrillic | 175.1 | 537.2 | 159.2† | **🏆 784.7‡** | 252.3‡ | 138.6† | 75.8† |
| chinese | 211.0‡ | 451.5 | 386.5† | **🏆 1,728.4‡** | 542.8‡ | 658.9† | 48.7‡ |
| japanese | 272.5† | 423.0† | 368.9† | 2,003.2† | 660.3† | 643.1† | 90.8† |
| korean | 245.4 | 737.5 | 289.5† | **🏆 1,313.0‡** | 425.4 | 259.8† | 146.7† |
| mixed | 185.4† | 321.7† | 245.9† | 931.9† | 400.6† | 249.1† | 89.1† |
| long | 4.3† | 5.6† | 4.2† | 14.5† | 8.2† | 9.3† | 1.4† |

### Slugify

| Test | Before Full 2.6.2 | After Full 2.7.0 | After Latin 2.7.0 | slugify JS 1.6.9 | slug 12.0.1 | speakingurl 14.0.1 | Sindre slugify 3.0.1 | limax 4.2.3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ascii | 85.3 | **🏆 744.0**≈ | 708.7 | 111.7 | 42.9 | 40.5 | 111.0 | 30.2 |
| latin | 103.2 | **🏆 625.5**≈ | 581.2 | 185.1 | 63.0 | 55.0‡ | 97.6‡ | 38.6‡ |
| cyrillic | 76.1 | **🏆 368.7** | 155.5† | 128.6‡ | 49.2‡ | 45.3‡ | 59.1‡ | 32.8‡ |
| chinese | 71.3‡ | **🏆 279.8** | 356.3† | 296.0† | 31.4† | 90.7† | 122.6† | 6.6‡ |
| japanese | 82.2† | 350.2† | 396.5† | 341.3† | 37.7† | 118.5† | 129.5† | 53.0† |
| korean | 82.6 | **🏆 508.8** | 292.1† | 255.9† | 19.7† | 71.0† | 84.8† | 48.2† |
| mixed | 73.3† | 247.9† | 203.4† | 128.2† | 27.9† | 48.7† | 78.3† | 20.7† |
| long | 2.9† | 5.3† | 4.0† | 2.9† | 0.6† | 0.8† | 6.5† | 0.4† |

## Protocol and validity

12 configurations, 600 samples, 54,166,600 completed calls, zero errors/failures. 5 rotated rounds, 250 ms target, 12 ms warmup/calibration; one worker timed at a time. Every sample checks completed calls, consumed output units/checksum and stable complete outputs. These are public string API measurements, not an end-to-end application or universal fastest claim.

Host: Intel(R) Xeon(R) CPU E5-2698 v4 @ 2.20GHz, 64 logical CPUs, darwin/x64; Node v26.5.0. JavaScript phase 2026-10-23T13:26:35.690Z–2026-10-23T13:29:38.566Z, load [14.59716796875,14.01513671875,12.59814453125]→[10.193359375,12.7099609375,12.35009765625]. Background desktop/database work remained active; no samples were discarded. All ranges and coefficients of variation remain in summary.csv.

Dictionary/page/locale-pattern caches are warm; installed slug has no whole-input result cache. No language winner is inferred from deletion, fallback encoding, retained Unicode or a failed reading probe. Japanese Kanji readings fail the probe across these configurations; mixed/long inherit that restriction.

| Configuration | Actual package version | Runtime / options |
| --- | --- | --- |
| After Full 2.7.0 | 2.7.0 | Node v26.5.0; Defaults, full character map |
| After Latin 2.7.0 | 2.7.0 | Node v26.5.0; Defaults, Latin character map |
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

## Startup and memory

Single import/first-call observations exclude process startup and use uncontrolled OS caches. Post-GC warm deltas include saved outputs/JIT/library caches and are not exact library allocations.

| Configuration | Import ms | First mixed call ms | Warm heap delta MiB | Warm RSS delta MiB |
| --- | ---: | ---: | ---: | ---: |
| After Full 2.7.0 | 58.55 | 2.161 | 4.034 | 34.891 |
| After Latin 2.7.0 | 8.59 | 2.482 | 0.630 | 20.660 |
| Before Full 2.6.2 | 44.76 | 0.801 | 3.804 | 29.574 |
| AnyAscii JS 0.3.3 | 7.42 | 4.632 | 1.891 | 11.246 |
| Unidecode JS 1.1.0 | 2.69 | 10.357 | 1.251 | 19.555 |
| Sindre transliterate 2.3.1 | 28.02 | 1.996 | 1.102 | 10.758 |
| pinyin-pro 3.29.5 | 83.95 | 30.539 | 8.959 | 51.840 |
| slugify JS 1.6.9 | 2.91 | 0.885 | 0.379 | 16.746 |
| slug 12.0.1 | 3.63 | 0.941 | 0.405 | 17.559 |
| speakingurl 14.0.1 | 8.05 | 2.363 | 0.456 | 12.832 |
| Sindre slugify 3.0.1 | 41.08 | 5.204 | 1.174 | 13.781 |
| limax 4.2.3 | 93.82 | 46.650 | 9.546 | 73.434 |

## Browser artifacts

| File | Raw bytes | Gzip 9 | Brotli 5 |
| --- | ---: | ---: | ---: |
| dist/browser/bundle.umd.min.js | 188440 | 55445 | 55255 |
| dist/browser/bundle.esm.min.js | 188162 | 55305 | 55245 |
| ./dist/browser/latin.esm.min.js | 19388 | 7591 | 6671 |

## Artifact provenance

Previously tested archive: 575250 bytes, SHA256 `4b9f12a64898343b5698e86383e4ae0de3a471b5726ac4ea28f08ee02b098daa`. Its 16 distribution payload files match the measured code. README generation happens after that archive was packed; this is not a byte-identical archive of the newly edited documentation.

Library source/dist hashes, loaded entries, actual package/runtime/compiler versions and every output/probe/sample are retained in the raw results.json. The compact committed snapshot is RESULTS.md, summary.csv, RESULTS.html and result-summary.json. Detailed timestamped runs remain under ignored results/. Reproduce with the documented TypeScript build/run commands in README.md; before-after.csv in a detailed run includes all paired ranges/output counts, including optional pre-optimization attribution.
