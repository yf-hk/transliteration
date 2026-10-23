## Verdict

- **Keep** the ASCII-classification change, folded into Candidate B below.
- **Drop** numeric-private as written. It changed the iteration but kept the string-keyed lookups. That fits its result: sparse Latin improved, the dense scripts did not.
- **Next:** a private, lazily paged code-point index plus one numeric loop (Candidate A). It is the only option aimed at the cost I think dominates.
- **Lazy public-map materialization:** not yet. It saves memory and startup time, not throughput beyond what A gives.
- **No native or WASM rewrite.**

## 1. Costs: evidence vs. hypothesis

**Evidence**
- Chinese spends 18.9% in `PUNCTUATION_REGEX`: every Han reading, plus the previous tail.
- Long mixed spends 13.7% in per-character `hasChinese`.
- Numeric-private: Latin slugify 1.23× with disjoint ranges; Cyrillic and Korean flat.
- Unidecode's per-character work is two integer-indexed array loads.

**Hypotheses**
- **H1, dense scripts: the string-keyed lookup dominates.**
  - Above U+00FF, `str[i]` or a regex match allocates a fresh one-unit string. V8's single-character cache covers Latin-1 only.
  - A keyed load with a non-internalized key costs a string-table probe, then probes into a huge dictionary-mode object. That happens twice per character (`hasOwn`, then get).
  - Latin's accented keys are mostly cached and sparse, which is why only Latin showed the iteration gain.
- **H2, short or sparse strings: fixed per-call cost dominates.** Each call pays for:
  - `Reflect.ownKeys`, `search`, two `deepClone([])` calls and an ignore array.
  - A full `hasChinese(str)` scan and two WeakMap reads.
  - The replace builtin's setup.
- **H3, Han strings:** up to five regex executions per non-Han character.

**Confirm H1 before building.** Run `node --prof` plus `--prof-process` on the Cyrillic and Korean fixtures; unlike `--cpu-prof`, it separates builtins and C++. If `KeyedLoadIC_Megamorphic`, `ObjectHasOwn`, string-table lookups and scavenges total under about 25% of ticks, A won't pay.

**Noise.** Classification changed no code that Latin, Cyrillic or Korean execute, yet their medians moved −6% to −16%. That is either noise or JIT coupling through the single large `codeMapReplace` (shared feedback and inlining budget). To handle both:
- Split the private non-spacing loop, the private spacing loop and the generic loops into separate functions.
- Run at least 15 interleaved rounds.
- Gate on bootstrap CIs of per-round ratios, not on range overlap.

## 2. Candidates (priority order)

### A. Private paged index + numeric loop

**Where the state lives.** Put the index on the existing `mapAccess` entry, as `{ pages } | 'exposed'`. Exposure through any API then drops it for every sharer at once.

**How pages are built.**
- On first non-ASCII use, allocate `pages = new Array(0x1100).fill(null)`.
- On first touch of a page, probe its 256 keys with `Object.hasOwn` into `new Array(256).fill(undefined)`. These are own-data reads, so they are unobservable.
- Pages with no own keys share one `EMPTY` sentinel, so memory is bounded by the map, not by inputs.

```ts
function privateNonSpacing(str, map, st, unknown /* string */) {
  let out = '', start = 0;
  for (let i = 0; i < str.length; i++) {
    let cp = str.charCodeAt(i);
    if (cp < 0x80) continue; // ASCII identity verified at registration
    let width = 1;
    if (cp >= 0xd800 && cp <= 0xdbff) {
      const low = str.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        cp = (cp - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
        width = 2;
      }
    }
    let mapped = page(map, st, cp >>> 8)[cp & 255];
    if (mapped === undefined) {
      // Inherited: caller reruns the generic loop from index 0
      if (str.slice(i, i + width) in map) return undefined;
      mapped = unknown;
    }
    out += str.slice(start, i) + mapped;
    start = i + width;
    i += width - 1;
  }
  return start ? out + str.slice(start) : str;
}
```

**Constraints**
- Check `in` on every miss. Never cache a scan of `Object.prototype`.
- On inherited keys, restart rather than resume. Restarting is exact only because this loop runs no user code.
- No holes in page arrays. A hole read consults integer keys on `Array.prototype`/`Object.prototype` and would surface user values as mappings.
- Only `registerDefaultMap` creates index state. Clones from `setData` or reset never get it.
- Keep `''` (a known deletion) distinct from `undefined`. Assert that every private value is a string.
- Complete the 2×2 grid {replace callback, numeric loop} × {string key, index} to separate lookup cost from iteration and builder cost. Ship one mechanism for all inputs, with no length thresholds.
- Optional, measured separately: fold `hasChinese(str)` into this pass. A BMP unit in its character class proves Han; high surrogates D81B–D884 defer to the regex.

This is a derived view of an immutable private map, not a result cache. It is keyed by page, bounded by the map, and dropped on exposure.

**Prediction:** Cyrillic and Korean ≥1.3×, and Latin above Unidecode. A gain under 1.15× (CI) falsifies H1; then drop both the index and lazy materialization.

### B. Private spacing loop v2

Same index, in a separate function. It runs only when there are no ignore ranges and `unknown` is a string. The generic loop stays untouched.

```ts
// Inside `if (s)`, as today. lastCode starts at -1.
if (c < 0x80) { han = false; num = isDigit(c); lat = isAsciiLetter(c); }
else if (c >= 0x4e00 && c <= 0x9ffc) { han = true; num = lat = false; }
else {
  han = mayBeHan(c) && hasChinese(ch); // 2E80–303B, 3400–9FFC, F900–FAD9, D81B–D884
  num = lat = false;
  if (NUMBER_OR_LATIN.test(ch)) { num = NUMBER_REGEX.test(ch); lat = LATIN_REGEX.test(ch); }
} // NUMBER_OR_LATIN = /^[\p{Number}\p{Script_Extensions=Latin}]$/u
if ((lastHan || (han && (lastLat || lastNum)) || (num && lastLat) || (lat && lastNum)) &&
    !hasPunctuationOrSpace(s) && !punctUnit(lastCode)) s = ` ${s}`;
lastHan = han; lastLat = lat; lastNum = num;
lastCode = s.charCodeAt(s.length - 1); // punctUnit: <0 false, <128 mask, else regex on fromCharCode
```

- **Punctuation check.** `hasPunctuationOrSpace` becomes an exact scan for strings: ASCII units go through a 128-bit mask, and the first non-ASCII unit hands the whole string to the original regex. Non-strings still go to the original regex.
- **Evaluation order.** Testing transitions before punctuation is unobservable only because `s` is a string here. Keep the original order anywhere `s` may be a non-string.
- **Tail tracking.** `lastCode` is the last code unit, matching `slice(-1)`, including a lone low surrogate. `ch` is materialized only for non-ASCII, non-basic-Han characters and for misses.
- **Mask constants.** Pin them with an exhaustive 0–127 test against the regexes. Deriving them at import would compile the `\p{…}` regexes at startup for every user.
- **Union filter.** It is exact; Roman numerals are both Number and Latin, so they still run both tests. Kana and Hangul drop from three regex calls to one.

**Prediction:** together with A, Chinese ≥1.5× and mixed ≥1.6× vs. current.

### C. Known-default plumbing (only if Latin or short strings miss the gates after A and B)

- Read `mapAccess` once and pass it down.
- Skip the replace/ignore/trim/replaceAfter plumbing when `opt === defaultOptions`. This is safe only if `defaultOptions` and its arrays are unreachable from every entry point and format. If they are reachable, they are mutable public state and this shortcut is unsafe.

## 3. Unsafe shortcuts to reject

- **Per-instance "private" flags, or an index cached on `this`.** A sibling keeps using it after the other API exposes the shared map. Re-privatizing after a reset is the same bug, because the clone is returned to the caller.
- **"Fast path until the first Han."** Once Han is present, Latin↔digit spacing applies to the whole string: `abc123中` → `abc 123 Zhong`.
- **Updating state on empty mappings.** Deleted characters and `unknown: ''` skip the spacing block entirely, so the flags and last output carry the previous non-empty character.
  - Don't hoist flag updates above `if (s)`.
  - Don't track the tail by code point.
- **Unidecode-style trailing spaces in the data.** They change output.
- **Intrinsic patching.** The shipped fast path already changed which intrinsics run compared with 2.6.2. Write "unmodified intrinsics assumed" into the contract. Otherwise every candidate violates it, shipped code included.

## 4. Representation, native code and Rust

**Numeric representation.** Hot-loop edits cannot remove per-character key hashing; only a numeric representation can. A is warranted.

**Lazy materialization.** Prototype it only if A passes and the eager map is expensive, say ≥2 MB retained or ≥5 ms at import.
- **Shape:** make map construction a pure factory with define semantics, using an object literal or `Object.fromEntries`. Assignment would fire `Object.prototype` setters installed after import.
- **Lifecycle:**
  - Build pages from a transient factory object, then drop it.
  - Re-run the factory once, on first exposure, reset or inherited fallback, through one handle shared by all siblings.
  - Index misses check `ch in Object.prototype`.
- **Hazards:**
  - `protected map` becomes lazy, so check whether `Transliterate` is reachable by subclassers.
  - Key order, descriptors and prototype must equal the eager object's.
  - `setData` users pay for the factory twice.
- **Gates:**
  - Retained heap after import plus one call drops at least 50%.
  - Import is not slower.
  - First `setData()` costs at most the eager build time plus 20%.

**No WASM or native rewrite.**
- It can't host the live-object and getter semantics.
- UTF-16 marshaling outweighs the actual work on short strings.
- It adds size, and browser compile limits complicate the jsDelivr formats.

**Rust deunicode is a different runtime.** It iterates UTF-8 bytes, bulk-copies the ASCII prefix, uses static tables with inline short readings, reserves output up front, and has no JIT or GC. Expect it to stay several times ahead on every script, ASCII included. The defensible claim is "faster than Node Unidecode on equal-output fixtures."

## 5. Acceptance gates

**Correctness**
- The full existing suite: 1.248M comparisons plus API/package checks, across all formats.
- Adversarial tests against the current build:
  - `Object.prototype` data properties and getters on unknown and own characters.
  - Getters that call `setData`/`config` or mutate the returned map mid-string, with call counts checked.
  - Integer keys on `Array.prototype` and `Object.prototype`.
  - Exposure through each API, including Latin, flips the sibling immediately.
- Exhaustive spacing check over all sequences of length ≤3:
  - Characters: basic, Ext-A and astral Han; ASCII letter; digit; ASCII punctuation; space; é; ①; Ⅻ; Kana; Hangul; deleted character; unknown character; lone high and lone low surrogate.
  - Crossed with `unknown` ∈ {`''`, `'?'`, `'中'`, an object with a counted `toString`}.

**Performance** (≥15 interleaved rounds; 95% bootstrap CI of the per-round ratio)
- A: Cyrillic and Korean CI lower bound above 1.15 vs. current, or stop.
- Latin and Korean (8/8 equal output): CI lower bound above 1.0 vs. Unidecode. Report the other fixtures, labeled as different-output.
- No fixture×API combination with a CI lower bound below 0.95 vs. current.
- The same direction on a held-out real-text corpus not used during development, and on one non-V8 engine (Bun/JSC).

**Footprint**
- gzip ≤ +600 B for the full bundle and ≤ +350 B for Latin, after deleting superseded paths.
- Retained heap ≤ +300 KB, reported with the count of built pages.
- Cold first non-ASCII call ≤ +0.5 ms.

**For round two, please bring back:**
- The `--prof` tick breakdown for Cyrillic and Korean.
- The two new cells of the 2×2 grid.
- The eager map's retained heap and import time.
- Whether `defaultOptions` and `Transliterate` are reachable from the package surface.