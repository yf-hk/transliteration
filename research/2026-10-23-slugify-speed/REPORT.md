# Why npm slugify is faster, and whether we can surpass it

**Yes, on some workloads already.** A focused comparison of identical outputs
found the existing research prototype **1.80× faster than `slugify@1.6.9` on
ASCII**. On accented Latin it was effectively tied: the ranges overlap. The
current production implementation remains slower on both groups. These results
do not establish superiority across all languages, input sizes or options.

Research completed by Astra/max on 2026-10-23, Asia/Singapore. Production source,
the maintained benchmark suite and the pending tooling changes were not edited.

## Focused measurement

Node **22.23.2**, macOS x64, Intel Xeon E5-2698 v4, 64 logical CPUs. Eight ASCII
and eight Latin strings came from the maintained benchmark fixtures. All three
implementations returned **exactly the same 16 output strings**, checked before
timing. `slugify` uses `{ lower: true, strict: true }`; ours uses its default
slug policy. These policies do not agree on every possible input.

| Fixture | Current ours | npm slugify 1.6.9 | Existing optimized prototype |
| --- | ---: | ---: | ---: |
| ASCII | 65,072 [56,501–66,901] | 103,100 [93,457–108,851] | **185,513 [148,542–206,447]** |
| Accented Latin | 71,447 [63,975–78,921] | 149,919 [144,648–160,531] | **146,785 [122,278–160,282]** |

Units: calls/second; median [minimum–maximum] from five rotated runs. Each call
processes one whole string. The prototype is 2.85× current on ASCII and 2.05× on
Latin. Its 2.1% lower Latin median than npm slugify is not a meaningful loss given
the observed ranges; neither implementation demonstrated a Latin advantage here.

There were **30 valid samples, 1,254,848 completed timed calls and zero failures**.
Every sample checked output length totals, consumed checksums and exact output
stability. Warmup was at least 150 ms and calibration at least 25 ms before each
350 ms target sample. Implementations ran in separate persistent processes, with
only one active timed process. No output-result cache was added.

The shared host remained busy: load averages changed from 23.69/23.07/24.18 to
24.64/23.37/24.26. CPU/wall ratios were 0.992–1.025, median 0.997. The work was
CPU-bound, but shared-host scheduling and clock variation remain limitations.
These are public-library API timings, excluding application I/O and request work.

The first adapter smoke attempt rejected a CJS namespace/default interop mistake
before any timing; it is preserved as `adapter-smoke-failure.json`. The successful
run uses the corrected adapter and contains no rejected samples.

Evidence: [raw samples and outputs](results.json), [predeclared claims](CLAIMS.md),
[driver](run.mjs), [worker](worker.mjs), [fixtures](../../benchmark/fixtures.mjs).

## Why the current path costs more

1. **Repeated options copying.** One default slug call recursively clones the
   options object four times: the slug getter and merge, then the virtual slug
   getter and merge inside inherited transliteration. Two empty replacement
   arrays are also cloned/formatted. See [slug getter/call](../../src/common/slugify.ts#L19)
   and [transliteration entry](../../src/common/transliterate.ts#L216).
2. **General-purpose work on ordinary text.** The current loop still scans/maps
   ASCII and checks surrogate pairs and ignored ranges. Cleanup uses the custom
   match/interval helper even when nothing is ignored.
3. **Repeated cleanup setup and passes.** Each call escapes the separator,
   constructs regular expressions, sanitizes, collapses separators, trims them
   and changes case. The helper constructs another regex. See
   [slug cleanup](../../src/common/slugify.ts#L47) and
   [replacement helper](../../src/common/utils.ts#L160).

The competitor uses a smaller direct slug pipeline: normalization, character
mapping/filtering, optional strict filtering, trim, whitespace replacement and
lowercase. It has no recursive options cloning or equivalent ignored-span /
before-and-after replacement pipeline. Its own `split`/`reduce` and per-character
replacement also allocate and do work; it is not inherently an unbeatable
algorithm. Primary sources: [installed 1.6.9 implementation](../../benchmark/node_modules/slugify/slugify.js#L18),
[publisher source](https://github.com/simov/slugify/blob/8d8c538c53ddf5c1023c8b4769681bb53877746b/slugify.js),
[documented options and map extension](https://github.com/simov/slugify#options).

Broader coverage also changes the task. Our full mapping contains 42,006 known
entries. The competitor drops the tested Chinese/Hangul instead of producing
their readings. We therefore excluded CJK from this same-output contest; those
shorter outputs cannot establish faster equivalent transliteration. Conversely,
its locale and symbol conventions are not identical to ours, either. A smaller
dictionary by itself does not explain the measured ASCII gap.

## Separate profile evidence

Two-second CPU profiles were collected after warmup, separately from every
reported throughput measurement. They alternate the ASCII and Latin fixtures.
Shares below are grouped self samples, including normal sampling/inspector
overhead; they are diagnostic, not exact causal speedup budgets.

| Current implementation | Profile self samples |
| --- | ---: |
| Slug wrapper/cleanup | 26.1% |
| Recursive option cloning | 19.6% |
| Custom replacement helper | 15.6% |
| Mapping loop | 11.6% |
| Transliteration wrapper | 9.4% |
| Separator escaping | 4.7% |

In the prototype, mapping falls to about 6.1%, while slug cleanup, replacement
and separator escaping account for about 73.6% combined. That identifies the next
target for Latin. Merely accelerating its remaining mapping work cannot plausibly
double total speed. Removing the current clone self time alone would likewise
not explain the combined prototype's full gain.

The competitor's profile is dominated by its character reducer and slug wrapper
(about 66.2% combined); allocation/GC is also present. Source positions and
generated function snippets are saved in [grouped profiles](profiles-grouped.json).
Raw profiles: [current](ours-current.cpuprofile), [competitor](slugify.cpuprofile),
[prototype](ours-prototype.cpuprofile). Reproduction script: [profile.mjs](profile.mjs).

## What has already been demonstrated

The measured prototype is the existing `packed12-linear-spacing` full API, with
numeric mapping, compact shared values, algorithmic Hangul, a guarded printable
ASCII path, fewer options clones, native replacement when no span is ignored,
and a linear Chinese-spacing loop. It retains the full map and falls back for
custom/exposed maps; it is not a Latin-only replacement.

The prototype was previously checked across all BMP code units and the custom
map/config/reset/ignore/replacement contracts. See the
[earlier parity evidence](../2026-10-23-performance/prototype-followup-parity.json)
and [implementation generator](../2026-10-23-performance/build-prototypes.mjs).
This follow-up rechecked the 16 measured outputs against the current build.

Current production was bundled by tsdown/Rolldown; the older research prototype
was bundled by esbuild 0.28.2. The result compares complete built implementations,
not an isolated packing ablation. Earlier same-bundler confirmation also measured
the combined algorithm changes; [that report](../2026-10-23-performance/REPORT.md)
provides supporting evidence. Do not attribute this gain to the 12-bit codec alone.

## Recommended next implementation

First port the small, already-proven execution changes: resolve options once,
copy only mutable replacement rules when actually needed, use native replacement
for the no-ignore path, and guard the printable-ASCII shortcut against custom
mapping/configuration semantics. Keep the existing slow path for richer options.

Then target Latin's remaining cleanup cost: precompile the default sanitization
and separator regexes, avoid escaping the fixed default separator per call, and
evaluate combining redundant cleanup passes. These latter changes are **proposed,
not measured here**. Guard custom separators, literal `$` replacements, ignored
tokens and live configuration changes; avoid an unbounded regex cache.

Re-run the matching-output benchmark and existing parity suite after each change.
The defensible goal is to beat this competitor on common default ASCII/Latin
slugs while retaining our broader behavior. Results will remain workload-specific.
