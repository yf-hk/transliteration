# Four hardening fixes

All four requested issues are fixed on the existing dirty `codex/modern-tooling-benchmarks` branch. The package remains 2.6.2, runtime dependencies remain zero, and no commit, push, registry publication or release was performed. Existing toolchain, benchmark and performance work was preserved.

## Ignored text traversal

`codeMapReplace` already used binary search for membership, but its `ignoreRanges.find(...)` restarted at the first interval for every ignored character. A cursor now advances through the already sorted, merged UTF-16 intervals and provides both membership and the ignored token boundary. The existing replacement helper already walked ranges monotonically and was left unchanged.

A deterministic regression counts indexed interval reads instead of imposing a wall-clock deadline. For 128 / 512 / 2,048 ignored spans, the baseline reads 10,829 / 144,655 / 2,163,729 intervals; the final traversal reads 894 / 3,582 / 14,334. The regression was run before the fix and failed with 144,655 reads against its 15,360 bound. Exact Chinese-spacing output is checked too. [Raw counts](interval-reads.json), [reproducer](interval-reads.ts).

The first public-path experiment showed a second quadratic cost in the same workload: reading `result.slice(-1)` after each append repeatedly accesses the growing output. A three-line change keeps the last emitted UTF-16 code unit instead. It updates only after a nonempty emitted fragment, preserving empty mappings and the existing spacing state. The separate baseline CPU profile attributes most sampled time to `codeMapReplace` and its interval-search callback; the cursor-only profile still attributes most time to `codeMapReplace`. The prior isolated tail-read research is in `../2026-10-23-performance/REPORT.md`. [Cursor-only measurements](measurements-cursor-only.json), [baseline profile summary](profile-summary.json), [cursor-only profile summary](profile-after-cursor-summary.json).

Five alternating rounds on Node 26.5.0, Intel(R) Xeon(R) CPU E5-2698 v4 @ 2.20GHz, 64 logical CPUs, using the public `transliterate` function with `'你é '.repeat(spans)` and `ignore:['你']`:

| Ignored spans | Before median, range ms/call | Final median, range ms/call |
| --- | --- | --- |
| 1,024 | 5.466, 4.688–8.290 | 1.017, 0.975–1.197 |
| 4,096 | 75.876, 66.285–85.814 | 4.065, 3.706–4.198 |
| 16,384 | 1,108.933, 1,100.273–1,154.171 | 16.039, 14.900–17.003 |

The largest tested input is 69.1 times faster, and the final medians grow approximately fourfold for fourfold input. This describes the measured fixed-ignore-pattern workload, not arbitrary user regexes, arbitrary growing ignore dictionaries or every JavaScript engine. Occurrence discovery and interval sorting retain their existing algorithms. CPU load included unrelated database, Python and desktop processes; before/after sides alternated, and builds/profiling were separate from the final measurement. Every fixture's full output was checked before timing; timed loops checked output lengths and consumed the returned strings. There were 340,825 completed timed calls and zero failures. The final compiled entry hash matches the measured hash. [Measurement code](measure.mjs), [raw rounds and metadata](measurements.json).

Default ASCII and Latin slugification ranges overlap, so there is no measurable regression or improvement in these checks. ASCII medians: 6.094 to 6.111 microseconds/call, before range 5.426–6.978 and after 5.824–6.660. Latin: 5.873 to 5.464 microseconds/call, before range 5.138–6.129 and after 4.968–5.529. These compare the already optimized pre-hardening build with this final build.

## `__proto__` cloning

Plain assignment to a JSON-parsed own `__proto__` property invoked the inherited setter on the clone and changed its prototype. `deepClone` now defines that one key as an ordinary enumerable, writable, configurable data property; other keys retain the existing assignment path. Array, Date, RegExp and primitive cloning are unchanged.

The pre-fix regression reproduced clone prototype mutation. Final tests verify own descriptors, ordinary clone prototypes, nested values, separate cloned objects, `constructor.prototype` data, no global pollution, and literal public replacement-map entries. Installed full/Latin Node APIs and all four standalone browser bundles exercise the protected option path.

## CLI test helpers

`src/cli/cli.test.ts` interpolated input and options into `exec` shell command strings. Its quote escaping did not stop `$()` or backticks. The helper now passes argument arrays through `spawnSync` with `shell:false`, captures stdout/stderr and errors, and supplies real stdin file descriptors. Temp files use isolated directories and `finally` cleanup. Bun's runtime argument delimiter is handled separately from the CLI delimiter so option-like text stays positional.

Regressions exercise shell substitutions, environment-variable syntax, quotes, backslashes, operators and empty separators in input/ignore/replace/separator values. Inert marker files prove nonexecution. Both CLIs read a metacharacter-bearing real filename and assert that a path marker was not created. A separate negative control confirmed that the legacy shell helper created its inert marker and changed the payload. The maintained source/test/build/benchmark subprocess inventory contains no remaining `exec(command)` helper; subprocess argv calls and static workflow-shell contract execution remain.

## Publish the tested archive

Build CI now builds once and packs once before any tests. It exports `TRANSLITERATION_TARBALL`, records SHA-256, and tests that exact archive. Compatibility jobs verify checksum and strict action artifact digest before installing it on Node 20.0.0, 22, 24 and 26.

Release CI accepts a successful push run on main from the same repository, checks out its exact head SHA, and downloads `npm-package` from that exact triggering run ID. It verifies one tarball, its checksum, and package name/version against the checkout. Publication rechecks the checksum immediately and uses `npm publish ./archive.tgz --ignore-scripts --provenance`. OIDC permissions, registry configuration, version/tag gating and public metadata remain. The release job needs no Bun, dependency installation, build or repack.

The 12 workflow contract checks execute the actual verification/publication shell blocks using isolated fixtures. They reject wrong name/version, changed bytes, missing/duplicate archives and malformed manifests; both CI archive-test blocks reject altered bytes before invoking package tests. They prove that the package helper uses a supplied archive even when checkout metadata differs. Offline npm publication dry runs preserve archive-only files, exclude checkout-only files, match archive SHA-1, and create no lifecycle marker. Tests pass using local npm 11.17.0 and the release-pinned npm 12.2.1. The action's pinned metadata confirms strict `digest-mismatch:error` support: https://raw.githubusercontent.com/actions/download-artifact/v8.0.2/action.yml . Live GitHub Actions/OIDC publication was not executed. [Workflow checks](../../test/release-workflows.test.mjs), [npm 12 results](workflow-npm12.txt).

## Final validation and artifact identity

- Build passed; TypeScript and all 37 Biome-selected files passed; `git diff --check` passed. Final deslop review applied to the branch diff.
- 125 unit tests / 451 assertions passed, 100% function and 99.76% line coverage. [Log](unit-coverage.txt).
- 326,698 full/Latin baseline differential assertions passed, including every BMP character, defaults, malformed options, Unicode fuzzing, regex state, options/config snapshots and live maps. [Receipt](parity.json), [harness](verify.mjs).
- 24,000 additional seeded assertions passed across full/Latin transliteration/slugification, default/custom maps, merged/partial ignored tokens, surrogate halves, empty mappings and zero-width/sticky literal replacement rules. [Receipt](ignored-parity.json), [harness](ignored-parity.mjs).
- The same packed archive passed 20/20 package checks on exact Node 20.0.0 and 26.5.0. Browser UMD/ESM checks execute in Node VM/module contexts; physical browsers and CDN deployment were not exercised. [Node 20](node20-package.txt), [Node 26](node26-package.txt).
- Actual final-archive offline publication dry runs passed on npm 11.17.0 and 12.2.1. All 16 installed distribution files are byte-identical to the current build, declarations are byte-identical to the pre-hardening snapshot, and archive SHA-256 is unchanged after every check. [Receipt](final-receipt.json), [npm 12 dry-run metadata](publication-npm12.stdout.json).

Final archive: `artifacts/transliteration-2.6.2.tgz`, 552,890 bytes, SHA-256 `3882e644e8c28a67a82f82076d53ae755537cb8d11ae6eea3acf3db37c46c116`.

Increment over the pre-hardening optimized build: full Node entry +123 raw / +70 gzip bytes; Latin +146 raw / +60 gzip bytes. Packed archive +1,267 bytes (0.23%), including updated source maps and package script metadata.

Graft queries: five in this coordinating subtask and two in the CLI subtask. Their printed whole-file-baseline savings estimates total 230,997 tokens. The first broad query included large generated research bundles, inflating that estimate; it is a tool estimate, not measured context consumption. Later runtime queries were scoped to source. Release workflow edits required no Graft query.
