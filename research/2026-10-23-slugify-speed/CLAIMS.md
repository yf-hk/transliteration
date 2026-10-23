# Claims before measurement

Question: can our slugify implementation beat npm slugify 1.6.9 without changing
the returned slugs on the tested inputs?

Compare current built full API, slugify 1.6.9 with lower:true/strict:true, and the
previously parity-checked packed12-linear-spacing full API prototype. Only ASCII
and Latin fixtures are timed here; require exact cross-implementation output
equality before measuring. Do not treat deleted CJK as successful transliteration.

Expected claim, subject to results: the existing combined prototype removes
avoidable default-path work and can exceed slugify on at least some common
inputs. No universal superiority or causal claim about packing alone is assumed.

Five rotated rounds, independent persistent worker per implementation, >=150ms
warmup and >=25ms calibration before each 350ms target sample. Use the maintained
worker's output counts, checksum, post-timing equality and error checks. Record
median/range, CPU/wall, versions, hashes and host load. Profile separately.

Shared Intel Xeon host has 64 logical CPUs and load about22; unrelated SurrealDB,
Python and desktop processes cannot be stopped. No simultaneous task-owned CPU
work during measurements. This measures the public slug API, not an application
request or helper-only microbenchmark. Existing prototype retains full mappings,
customization/reset and fallback semantics; it is not a shipped implementation.
