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
bun run benchmark:full --before benchmark/.cache/published/package \
  --python benchmark/.venv/bin/python --update-readme
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

`Before Full 2.6.2` is that published release. `After Full` and `After Latin` are
**next (unreleased)**, loaded from this checkout's built exports. The working
manifest remains 2.6.2; no version bump or release is implied. Optional `--snapshot
PATH_TO_DIST` measures the frozen immediate-pre-optimization full/Latin builds for
attribution, separately from primary README columns. That dist directory must
retain its CommonJS package boundary.

### Native prerequisites

Python/Rust/ICU run **inside their own persistent processes**. Their workers remain
Python/Rust/C++; TypeScript orchestrates them. Launch/import/IPC/builds are untimed.

```sh
python3 -m venv benchmark/.venv
benchmark/.venv/bin/pip install -r benchmark/native/requirements.txt
cargo fetch --locked --manifest-path benchmark/native/rust/Cargo.toml
# macOS, when ICU/pkg-config are missing:
brew install icu4c pkgconf
```

Full mode builds Rust with `--release --locked --offline` and ICU with `clang++ -O3`
**before timing**. Set `--icu-prefix PATH` or `ICU_PREFIX` if pkg-config cannot find
ICU. `--python PATH` or `BENCHMARK_PYTHON` selects an existing Python environment.
CXX selects the C++ compiler executable. These are benchmark prerequisites, not
library dependencies.

### Narrow or inspect

```sh
bun run --cwd benchmark list
bun run benchmark --fixtures ascii,latin --javascript-only
bun run benchmark:full --javascript-only --adapters ours-full,published-full,unidecode
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
run and prevent README refresh. Rust uses `black_box` on inputs/results. ICU keeps
the converter resident and includes UTF-8/UTF-16 conversion, not uconv startup.

These are resident-process string API configurations, not service, FFI, WASM,
subprocess-call or application measurements. Node UTF-16, Python code-point and
Rust/ICU UTF-8 consumption have different overhead. Configurations are named; no
claim covers every library or tuning combination. The configured scope is nine
JS peers, four Python packages, two Rust packages, ICU, current full/Latin and the
published baseline.

Import/first-call and post-GC memory are single observations, separate from
throughput. OS caches are uncontrolled; heap/RSS include saved outputs/runtime
state and are not exact library allocations. Artifact compression follows all
timing. Comparator bundles are not synthesized or size-ranked.

## Structure

`src/run.ts` coordinates phases; `adapters.ts` resolves versioned packages;
`worker.ts` measures Node; `process.ts`/`protocol.ts` validate IPC; `native.ts`
builds/drives native workers; `fixtures.ts` owns inputs/probes; `analysis.ts`
computes medians/parity/eligibility; `report.ts` writes matrices and README;
`provenance.ts`/`artifacts.ts` bind measured bytes. `types.ts`/`json.ts` define the
protocol and parse external data at boundaries. Generated JavaScript lives in
ignored `.build/`; no parallel mjs implementation is maintained.
