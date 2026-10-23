# Benchmarks

The maintained benchmark is TypeScript. It compiles with the repository's existing
TypeScript compiler, then measures the built library in persistent **Node**
processes. Bun runs development scripts; it is not the measured JavaScript runtime.
No benchmark dependency enters the library runtime or published files.

## Run

From the repository root:

```sh
bun install --frozen-lockfile
npm ci --prefix benchmark --include=dev --ignore-scripts
bun run build
bun run --cwd benchmark typecheck

# Short JavaScript smoke measurement.
bun run benchmark

# All configured libraries, eight tests, five rotated rounds.
bun run benchmark:full --before benchmark/.cache/published/package --update-readme
```

Node >=20 runs the compiled tool; use one fixed Node version across comparisons.
Comparators may require a newer Node; retained results use Node 26.5.0. The library
continues to support Node >=20. No root dependency was added for this harness.

Prepare the published baseline once, or pass `--before` an existing extracted package:

```sh
mkdir -p benchmark/.cache/published
npm pack transliteration@2.6.2 --pack-destination benchmark/.cache/published
tar -xzf benchmark/.cache/published/transliteration-2.6.2.tgz \
  -C benchmark/.cache/published
```

`Before Full 2.6.2` is that published release. `After Full 2.7.0` and
`After Latin 2.7.0` use this checkout's built exports. Labels are read from each
package manifest. Optional `--snapshot PATH_TO_DIST` measures frozen full/Latin
builds from immediately before the optimization for attribution, separately from primary README columns. That dist directory must
retain its CommonJS package boundary.

### Narrow or inspect

```sh
bun run --cwd benchmark list
bun run benchmark --fixtures ascii,latin
bun run benchmark:full --adapters ours-full,published-full,unidecode
```

Relative option paths resolve from the repository root. `--output` must name a new
or empty directory. `--archive TESTED_TARBALL` verifies every measured dist file
against a previously tested tarball. README generation subsequently changes the
documentation bytes of a new pack; the old hash binds its distribution payload.
`--no-sizes` skips post-timing compression. Versions are not upgraded during runs.

## Results and README

**Tests are rows; versioned libraries are columns**, in separate transliteration
and slugify tables. 🏆 highlights the fastest eligible observed median. ≈ means
ranges overlap, so superiority is inconclusive. † disqualifies unsupported,
dropped, retained, fallback or failed-reading output. ‡ marks a passing limited
probe with different complete outputs. There is no overall score or winner when
all probes fail. A small passing probe does not validate every pronunciation.

ASCII/Latin before/after headlines require 8/8 identical complete outputs. Chinese
spacing/readings, Japanese Kanji, German conventions, language detection, tone
numbers and fallback policies differ. Raw speeds remain visible with markers;
faster deletion does not establish a reading win.

Each ignored timestamped `results/` directory contains:
- `results.json`, `preflight.json`, `verification.json`: complete outputs/probes,
  samples, versions, entry/source/dist hashes, consumption checks, load and errors.
- `summary.csv`, `before-after.csv`, `winners.csv`: medians/ranges/variation,
  exact-output counts, paired speedups and winner decisions.
- `transliterate-matrix.csv`, `slugify-matrix.csv`: numeric calls/second in the
  requested orientation.
- `report.md`, `matrix.md`, `matrix.html`: readable matrices; HTML scrolls and
  keeps test/library headings visible.

`--update-readme` requires a complete full run. It replaces only the marked root
README performance section and writes compact, committable [RESULTS.md](RESULTS.md),
[RESULTS.html](RESULTS.html), [summary.csv](summary.csv) and
[result-summary.json](result-summary.json). These permanent links do not depend on
ignored raw files being committed. Historical runs remain unchanged.

## Method

Eight deterministic strings per test cover ASCII, accented Latin, Cyrillic,
Chinese, Japanese, Korean, mixed scripts and long mixed strings. Long repeats each
mixed input 64 times. Full mode uses five rotated 250 ms samples, with 12 ms warmup
and calibration before each; quick mode uses one 15 ms sample. Only one worker is
timed at a time. Do not run builds/tests/profilers/compression concurrently; host
load and all ranges are retained.

Every timed call invokes a synchronous public API, indexes an input, checks its
string result and consumes output length plus first/last units into a checksum.
Iterations, output-unit totals and checksums must match preflight expectations;
complete outputs are checked before/after timing. Errors/timeouts invalidate the
run and prevent README refresh.

These are resident-process string API configurations, not service or application
measurements. All libraries run on the same Node.js executable and consume UTF-16
string results. The configured scope is nine JavaScript peers, current full/Latin
and the published baseline; it does not cover every library or tuning combination.

Import/first-call and post-GC memory are single observations, separate from
throughput. OS caches are uncontrolled; heap/RSS include saved outputs/runtime
state and are not exact library allocations. Artifact compression follows all
timing. Comparator bundles are not synthesized or size-ranked.

## Structure

`src/run.ts` coordinates phases; `adapters.ts` resolves versioned packages;
`worker.ts` measures Node; `process.ts`/`protocol.ts` validate IPC;
`fixtures.ts` owns inputs/probes; `analysis.ts` computes medians/parity/eligibility; `report.ts` writes matrices and README;
`provenance.ts`/`artifacts.ts` bind measured bytes. `types.ts`/`json.ts` define the
protocol and parse external data at boundaries. Generated JavaScript lives in
ignored `.build/`; no parallel mjs implementation is maintained.
