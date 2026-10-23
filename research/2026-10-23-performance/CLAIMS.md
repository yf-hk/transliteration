# Measurement plan, written before timing

1. Compare current main and published 2.6.2 against representative JS libraries on the same inputs and runtime. Output policies and language coverage differ: results are throughput of the named configurations, not a universal quality ranking.
2. Test whether replacing eager dictionary expansion with directly indexed immutable data reduces cold import time and post-GC memory. Compare page arrays, deduplicated values, and packed offsets/blocks with identical current mappings.
3. Measure actual full transliterate()/slugify() APIs as well as isolated lookups. A lookup-only gain does not establish an API gain.
4. Test a guarded printable-ASCII shortcut and removal of redundant option cloning. Preserve replacements, ignored spans, known-empty/missing mappings, custom supplementary maps, live returned maps, sharing and reset semantics.

Additional Astra-owned hypotheses, written before follow-up timing:

5. Numeric code-point lookup can reduce per-character overhead on the no-ignore/no-Chinese-spacing path; a native replacement callback can reduce manual match iteration while retaining literal replacement strings.
6. Tracking the last emitted character can avoid repeatedly reading the tail of an increasingly concatenated string during Chinese spacing. Test length scaling and a separate profile; do not call this quadratic until the evidence supports it.
7. Lazy decoding by value ID and 399 Hangul prefixes may improve particular cold/warm memory or Korean workloads; compare independently rather than assuming either wins.
8. The 12-bit transport encoding changes download/startup representation, not the warmed lookup body. Do not ascribe warmed throughput differences to that codec without a mechanism and repeatable evidence.
9. Cross-ecosystem Python and Rust runs describe the named functions on the same inputs with five interleaved repetitions and consumed/checked outputs. Native numbers exclude input transfer, FFI/WASM and service overhead and do not establish a faster replacement for the Node API. Release compilation and exact versions must be recorded.

Use production minified bundles, no profiler during measured runs, five fresh-worker runs per candidate/workload with rotated candidate order. Each worker warms and calibrates before timing, consumes returned strings, records work/checksum/CPU time and errors, and checks stable outputs outside timing. Compare exact prototype outputs against the current implementation before timing. Report median plus minimum/maximum, and treat close results inside variability as inconclusive.

Memory workers record import time and post-GC heapUsed/external/arrayBuffers/RSS deltas separately; V8 heap is not total process memory. Absolute RSS and external include allocator/runtime noise. Browser transfer size is measured as minified, gzip-9 and Brotli-11 standalone bundle bytes; npm tarball and installed bytes are separate metrics.

Hardware: shared Intel Xeon E5-2698 v4 host, 64 logical CPUs, macOS 15.7.5. Initial load averages 11.39/9.34/7.04. Other users' SurrealDB and Python processes are active; do not stop them. Serialize our timing/profiling/compression work and interleave candidates. These are host-specific single-process results, not server capacity or SLA figures.
