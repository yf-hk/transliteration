# Mapper representation investigation

Researcher configuration: **GPT-6 Astra, requested max effort**. Source inspected at `d1be1f35e48911b00377dcf5efd299aa74d50000` on 2026-10-23. Research artifacts only; no production files were changed. Astra subsequently took ownership of the entire task, audited the inherited broad benchmark, and completed independent confirmation, memory, package and cross-ecosystem measurements serially. Final results are in [the complete report](../REPORT.md).

## Finding and proposed direction

The first optimization is to stop building a large character-keyed object at import time. The generator emits 133 pages, an exported page lookup, and algorithmic Hangul code, but then also eagerly constructs the object, including all 11,172 Hangul syllables. The actual transliteration loop reads `this.map[char]`; it does not call the generated lookup. The generated lookup also returns `''` for missing entries, so connecting it unchanged would break the new unknown-versus-silent-character behavior. A new lookup contract must return `string | undefined`. [Generator](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/scripts/generate-data.ts#L105-L184), [actual hot loop](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/src/common/transliterate.ts#L71-L136).

The strongest compact candidate is **a shared table of unique strings, numeric IDs in pages, algorithmic Hangul, and lazy legacy-map materialization**. Use a compact encoding for distribution and decode once into a direct numeric table. The encoding used on disk need not be the representation used for every lookup. Direct string pages are a simpler alternative worth retaining in the comparison; final selection must include full-API speed, startup, and memory measurements.

Do not assume source pages and the built object both remain retained in the production bundle. The unused lookup may be removed during bundling, and temporary page arrays may become collectible. Eager construction and Hangul enumeration are verified source behavior; retained duplication requires heap evidence. Esbuild documents that unused ESM exports can be removed by tree shaking. [Esbuild tree shaking](https://esbuild.github.io/api/#tree-shaking).

## What the actual data allows

The generator and `manifest.json` measure the current data after the same Chinese trailing-space removal and Hangul exclusion as production:

| Property | Measured value |
|---|---:|
| Non-Hangul populated mappings | 30,834 |
| Algorithmic Hangul syllables | 11,172 |
| Total populated mappings | 42,006 |
| Explicit empty mappings | 1,744 |
| Distinct non-Hangul values, including empty | 3,576 |
| Distinct values concatenated | 12,776 ASCII bytes |
| Maximum output length | 12 characters |
| Populated 256-character pages | 133 |

All stored outputs are ASCII, and every input code point U+0000–U+007F maps to itself. The latter permits an ASCII fast path only while the relevant default mappings have not been changed through the public mutable-map API. A guarded whole-input ASCII path must also account for replacements and other options; skipping all processing would not be equivalent.

The Hangul index decomposition uses the same 19 initial, 21 medial, and 28 final combinations already present in this project. Unicode specifies the corresponding arithmetic decomposition and 11,172-syllable range; the prototypes preserve the project's exact output strings. [Unicode 17, section 3.12](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-3/#G24646).

## Executable alternatives

All six modules in `variants/` export `lookup(char)`, `materialize()`, and `metadata` and return an explicit empty string for a known silent character. Missing mappings return `undefined`.

| Variant | Representation | Numeric buffer bytes, exact |
|---|---|---:|
| `eager-object` | Current eager character-keyed object, including precomputed Hangul | 0 |
| `pages` | Direct string/null pages; calculate Hangul on demand | 0 |
| `pooled-offsets` | Uint16 page IDs and value IDs; Uint16 offsets into one ASCII string; slice per hit | 76,276 |
| `pooled-values` | Uint16 page IDs and value IDs; one JS string per distinct value | 69,120 |
| `pooled-blocks` | Deduplicated 32-entry blocks of Uint16 IDs; unique JS strings | 67,008 |
| `packed12-values` | Same runtime lookup and Uint16 tables as `pooled-values`; 12-bit text distribution encoding | 69,120 |

These are numeric-buffer sizes, not total memory. JS strings, references, arrays, functions, module state, and code also occupy space. `arrayBuffers` is included in Node's `external` value, so summing both double-counts the buffers. Compare heap plus external, report both components, and keep RSS separate. [Node memory accounting](https://nodejs.org/api/process.html#processmemoryusage).

`pooled-offsets` minimizes the number of retained value strings but creates a substring on each hit. In the exact Node 22.23.2 V8 source, substrings of lengths 2–12 follow the allocating copy path; 13 is the minimum sliced-string length. All current values fit below that threshold. Empty and single-character results have special handling. This explains why a tiny retained pool can still cause substantial allocation during repeated transliteration; it is a source-backed mechanism, not a measured GC rate. The unique-string variants return existing value references. [Node 22.23.2 substring implementation](https://github.com/nodejs/node/blob/v22.23.2/deps/v8/src/builtins/builtins-string-gen.cc#L1796-L1899), [slice threshold](https://github.com/nodejs/node/blob/v22.23.2/deps/v8/src/objects/string.h#L940-L953).

`packed12-values` serializes each value as two characters from a 64-character alphabet. Its IDs fit because 3,576 is below 4,096. ID 0 is reserved for missing, so only **519 additional distinct values** fit before this codec needs widening. The combined page-index/value-ID payload is 69,120 characters instead of 92,160 characters for ordinary base64 applied to the same Uint16 data: **23,040 fewer source bytes, or 25% less encoded ID text**. It decodes once at import into the same 69,120-byte Uint16 storage, using two alphabet lookups per word. This reduces distribution text without adding bit extraction to the hot lookup. The prototype generator asserts every encoded word is at most 4,095 and rejects overflow; a production generator must automatically select a wider codec or a 16-bit fallback when either value IDs or page IDs outgrow that limit. Startup time and compressed bundle size must still be measured; a smaller source is not a promise of either result.

The generated runtime decoders use ordinary JavaScript and typed arrays, without Node `Buffer`, browser `atob`, filesystem access, or a fetch. The 16-bit base64 decoder explicitly combines little-endian byte pairs into numeric elements; it does not reinterpret bytes through a host-endian Uint16 view. The 12-bit decoder also assigns numeric elements directly. This is deliberate portability for browser, React Native, and Node bundles; actual browser/React Native runtime validation is still required. The generator may use Node APIs because it runs during development, not inside the published runtime.

Fine block deduplication offers little for this dataset. The generator compared 16-, 32-, 64-, 128-, and 256-entry blocks. Thirty-two-entry blocks minimize numeric storage at 67,008 bytes, saving only 2,112 bytes against regular pages. Ordinary-base64 gzip payloads favor 256-entry pages: 46,967 bytes versus 48,081 for 32-entry blocks. The page-size choice therefore trades about 2.1 KB retained numeric memory for about 1.1 KB compressed payload in this encoding. More trie levels or rank/bitset lookups are not justified by this saving alone. These are measurements of the ID payload only, recorded in `manifest.json`.

The 133 allocated pages are about 90.6% populated (30,834 of 34,048 slots). A whole-BMP presence bitmap plus one Uint16 ID per present entry would already occupy 69,860 bytes before any rank/prefix index, exceeding the current paged numeric representation's 69,120 bytes. This density explains why sparse lookup structures offer limited savings here.

The typed ID approach is a practical experiment, not a universal claim that arrays beat objects. V8 uses different representations for indexed elements and named properties, and its packed/holey distinctions can change optimization opportunities. The benchmark must exercise the actual access path and target runtime. [V8 properties](https://v8.dev/blog/fast-properties), [V8 elements](https://v8.dev/blog/elements-kinds).

## Preserve the public API before optimizing it

`setData()` returns the live current map, not a snapshot. Initially `transliterate` and `slugify` share the same map object. A caller can obtain that object and mutate it directly, affecting both APIs and the default subsequently used by reset. Calling `setData(data)` or reset creates a new object; earlier returned references then refer to the older object. A sparse overlay that only affects lookup does not preserve full enumeration, deletions, object identity, or this sharing behavior. [Constructor and options](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/src/common/transliterate.ts#L35-L63), [setData](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/src/common/transliterate.ts#L188-L212), [shared entrypoint map](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/src/node/index.ts#L1-L17).

A compatible lazy design has one provider shared by the two API instances and an optional private dictionary on each instance:

1. Ordinary calls use the compact lookup until a legacy dictionary needs to be exposed.
2. A bare `setData()` on an untouched instance materializes one shared default dictionary and returns it. Other untouched instances read it too, so direct mutation continues to work.
3. `setData(data)` or reset creates a private dictionary. If the shared default was never exposed, materialize a fresh dictionary directly from the compact source; retaining an additional default dictionary is unnecessary. If it was exposed, clone its current contents.
4. Later updates clone the instance dictionary as today, preserving detachment of previously returned objects.

The initial integration prototype uses the simpler compatible fallback that first materializes a shared default for legacy operations. The refinement in step 3 is now implemented as `packed12-lean-custom` and passed 133,826 API assertions, including customization and reset before the shared map is exposed. In five fresh-process samples it retained about 3.55 MB of incremental heap+external memory after first customization, versus 5.13 MB for the initial compact bridge and 5.47 MB for current main. Its first custom call remained slower than current because dictionary construction is deferred. [Refinement parity](../prototype-lean-parity.json), [memory evidence](../memory-scenarios-lean.json).

A sparse own-property overlay remains a good design for a **new** API that returns nothing or returns only overrides. Check ownership before the base lookup so empty strings are preserved; support one Unicode code point, including supplementary characters and lone surrogates as currently accepted. If deleting a custom override should reveal the base while deleting an exposed full-map property should make a mapping unknown, those are distinct operations and need distinct semantics. Do not silently repurpose existing `setData()`.

Keep provider injection through the full and Latin entrypoints. Shared engine code must not import the full data provider, or the small Latin build can accidentally retain the full table. Config/reset isolation, ignore handling, replacements, and Chinese/Latin/number spacing should continue to run through the existing engine until separately measured changes have parity coverage. [Latin entrypoint](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/src/node/latin.ts), [Latin bundle regression checks](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/test/package.test.mjs#L261-L278).

The prototypes intentionally preserve the current BMP-only base data. Supplementary custom overrides remain the adapter's responsibility, and supplementary characters missing from the base return `undefined`. A future expansion of built-in CJK coverage must use the full code point and a page index spanning up to 4,352 Unicode pages, rather than `charCodeAt(0)` aliasing a surrogate pair to a BMP entry. A dense Uint16 index for all 4,352 pages occupies only 8,704 bytes, 8,192 more than the current 256-page index; actual populated page payloads determine the larger data cost. This representation can grow to supplementary planes without changing the public missing/empty distinction.

## Other speed and package levers

For Korean-heavy workloads, computing each syllable trades import-time work and retained memory for per-character arithmetic and concatenation. Precomputing just the 399 initial-plus-vowel prefixes reduces lookup to `prefix[Math.floor(offset / 28)] + final[offset % 28]`. This keeps one concatenation per syllable and retains 399 prefixes instead of 11,172 completed strings. The follow-up was measured, but its Korean throughput range overlaps the direct algorithm's range; there is insufficient evidence to make it the default.

Three additional experiments have a separate generator, `generate-followups.cjs`, so the initial benchmark inputs remain frozen:

| Follow-up | Purpose | Main tradeoff to measure |
|---|---|---|
| `packed12-codepoints` | Expose `lookupCode(codePoint)` and integrate a numeric scan when there is no Chinese-spacing work, no ignored range, and no exposed/custom dictionary | Avoid surrogate regex checks and one-character string creation on the eligible path; requires full-API parity |
| `pooled-offsets-memo` | Decode each output string once, cached by value ID | Lower cold string count and fewer repeated slices, but a cache array plus eventual retained strings; full-cache heap can exceed direct unique strings |
| `packed12-hangul-prefix` | Precompute 399 Hangul prefixes | Extra import-time work and retained prefixes in exchange for simpler Korean lookup |

The cache experiment must be measured in a fresh process and after representative use. Exhaustive correctness checks or `materialize()` populate every value and would destroy a cold-cache comparison. The numeric scan is the highest-priority general speed experiment; the Hangul prefixes address a narrower workload. The 12-bit and ordinary-base64 unique-value modules have identical lookup and Hangul function bodies, so unexplained warmed-throughput differences between them must not be attributed to the distribution codec.

The full API also clones option structures multiple times: the `options` getter clones defaults/config, `transliterate` clones the merged options again, and slugify adds another layer. Mapper-only speed therefore cannot predict full-API speed. A private normalized-options path could avoid repeated cloning while the public getter/config retains its copy behavior; replacement processing currently mutates cloned search tuples, so ownership must be proved before removing those copies. [Transliterate options and processing](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/src/common/transliterate.ts), [slugify processing](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/src/common/slugify.ts#L18-L74).

Npm package size is a separate problem from one browser bundle's size. The current build emits separate Node, browser ESM, browser IIFE, and two CLI bundles; source maps are enabled for the first three configurations and the package includes `dist`. The two CLI bundles can import a shared installed Node entry instead of each embedding the full engine/data. Package self-references are supported with `exports`, including CommonJS `require`; mark that dependency external during CLI bundling. Esbuild's automatic code splitting currently targets ESM, so simply turning it on is not a CJS solution. [Build configuration](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/tsup.config.ts), [package files](https://github.com/yf-hk/transliteration/blob/d1be1f35e48911b00377dcf5efd299aa74d50000/package.json), [Node self-reference](https://nodejs.org/api/packages.html#self-referencing-a-package-using-its-name), [esbuild splitting and external modules](https://esbuild.github.io/api/#splitting).

Source-map `sourcesContent` is another package-size choice. Removing it retains source locations but loses embedded original source for interactive debugging. Measure the actual npm tarball and unpacked contents before deciding; do not equate a mapper's gzip size with npm download size. [Esbuild source content](https://esbuild.github.io/api/#sources-content), [npm files field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#files).

## Verification and reproducibility

`verify-variants.cjs` bundles the current generated `data/charmap.ts` in memory and compares every BMP code point against each variant. It also compares the complete materialized dictionary, preserving both presence and empty values. All six pass 65,536 lookup comparisons and exact 42,006-key enumeration comparisons, plus four supplementary misses, an explicit empty mapping, a missing code point, and a lone surrogate. Results are saved in `correctness.json`. This proves mapper equivalence only; the parent's integration harness owns full-API parity and throughput evidence.

```sh
node research/2026-10-23-performance/astra/generate-variants.cjs
node research/2026-10-23-performance/astra/verify-variants.cjs
node research/2026-10-23-performance/astra/measure-sizes.cjs
```

The size script reports raw source, minified source, gzip level 9, and Brotli quality 11 for standalone mapper modules. It includes exported metadata and materialization helpers, so actual production API bundles are measured separately. Compression ran after timing tests to avoid contention. See [standalone sizes](sizes.json), [full API sizes](../prototype-sizes.json), [timing/memory summary](../summary.json), and [actual package sizes](../package-sizes.json).

## Final measured decision

Use compact unique values and lazy dictionary materialization for startup and memory, plus the independent engine improvements for speed. The combined full API browser ESM fell from 193,536 to 103,018 raw bytes, but gzip only fell from 53,240 to 51,887 bytes. Ordinary base64 typed-table variants actually increased gzip size. The current textual mapping already compresses well.

Five-run confirmation medians improved by about 13.4 times for ASCII transliteration, 2.0 times for Latin, 1.47 times for Chinese, 2.9 times for Korean and 3.4 times for long mixed text. These gains belong to the combined engine changes, not the ID transport codec alone. The critical additional finding was reading `result.slice(-1)` while repeatedly appending to a growing output; tracking the last emitted character instead keeps the measured Chinese scan near 2.6–2.8 million characters per second across a 64-fold input-length range. The exact inputs, ranges and separate profiles are in the complete report.

Cold incremental heap+external memory decreased from 3.665 to 0.626 MiB and median fresh-process import decreased from 68.40 to 27.97 ms for the combined prototype. This is not total process RSS. Existing `setData()` still needs a full live dictionary when exposed, so its deferred cost remains explicit. A separate packaging experiment shared the CLI engine and removed source-map embedded source content, reducing the local npm tarball from 550,243 to 229,088 bytes without changing the production source.

Graft source-discovery tally: approximately **110,708 tokens saved** (101,595 map + 9,113 callers, tool estimates). Initial calls pointed at the nested checkout without a graph; the explicit wrapper graph path resolved discovery. Exact current source and executable parity checks remain the evidence for the findings.
