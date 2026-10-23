# GitHub issue audit: confirmed bugs and necessary fixes

**Checked:** 2026-10-22, Asia/Singapore.

**Repository and package:** `yf-hk/transliteration`, `main` at `e69bb1bba461c8e5cab0937f97e0ff602a931885`; npm latest `2.6.2` has the same `gitHead`.

## Verdict

There are **four unambiguous, focused correctness bugs to fix first**, including the defect already described by open PR #252. There is also a reproduced mixed-script spacing inconsistency in #239. The other open records include real language-quality/coverage limitations, feature requests, performance proposals, and an already-fixed bundle-size issue.

The tracker currently contains **86 issues: 18 open and 68 closed**, plus **6 open PRs**. All open issue bodies and comments were reviewed; selected closed reports were checked for current regressions. This is not a claim that every historical environment or all 68 closed issues were fully reproduced.

## Evidence and scope

- Retrieved current issue/PR records from GitHub and npm metadata from the registry.
- Downloaded the published 2.6.2 tarball without running installation scripts and verified its SHA-512 integrity and SHA-1 shasum.
- Six inspected full/Latin Node/browser production artifacts are byte-identical between the published tarball and local build artifacts. All 132 embedded sources in the local full Node source map match the checked-out source.
- The focused reproduction runs against the **published package**, including Node CommonJS, browser UMD and standalone browser ESM APIs. Reproductions are minimized API calls with exact observed/expected results.
- The reproduction harness executes **52 checks**: 24 assertions fail across the same four bug references and three full distribution variants; three additional checks reproduce the spacing inconsistency. Working controls have **zero unexpected failures**.
- The existing **13 package tests pass** against the inspected local artifacts. Those tests do not cover the four newly demonstrated contracts. The complete Vitest suite was not run in this audit.
- No production source was modified and no GitHub comments, issue state changes, PR reviews or merges were made.

Saved evidence: [live issues](github-issues.json), [open PR metadata](github-open-prs.json), [npm metadata](npm-metadata.json), [reproduction results](reproduction-results.json), [existing package test output](package-tests.tap), [PR #252 patch](pr-252.patch).

## Fix first

### 1. PR #252: `allowedChars: undefined` silently corrupts ordinary slugs

[GitHub PR #252](https://github.com/yf-hk/transliteration/pull/252)

```js
slugify('Hello World', { allowedChars: undefined });
// actual:   "e-d"
// expected: "hello-world"

slugify('Hello World', { allowedChars: null });
// actual:   "ll-l"
// expected under PR's nullish-fallback contract: "hello-world"
```

An undefined optional property is common when spreading optional configuration; the undefined case alone establishes the bug. `null` is an additional JavaScript robustness case, not a value accepted by the declared string type. The same error occurs after setting default config with `allowedChars: undefined`.

**Cause:** options merge preserves the undefined/null property, and [`src/common/slugify.ts:53`](../../src/common/slugify.ts#L53) interpolates it into a regex character class. That creates a class containing the letters in the word `undefined` or `null` rather than using the intended default.

**Necessary fix:** use a nullish default for `allowedChars` before regex construction, preserving intentional empty strings. The existing PR contains this focused change and regressions; review/adapt it against current main rather than duplicating it. This audit verifies its reported defect, not the PR's complete merge readiness.

### 2. #246: intentional deletion is treated as an unknown character

[GitHub issue #246](https://github.com/yf-hk/transliteration/issues/246)

```js
transliterate('ъ', { unknown: '?' });
// actual:   "?"
// expected: "" for this source table's intentional silent mapping

transliterate.setData({ x: '' });
transliterate('axb', { unknown: '?' });
// actual:   "a?b"
// expected: "ab"
```

**Two causes are confirmed:**

1. The source data has `ъ -> ''`, but [`scripts/generate-data.ts:37`](../../scripts/generate-data.ts#L37) collapses empty strings to null; generated map population at [line 156](../../scripts/generate-data.ts#L156) also uses truthiness. The published runtime map consequently has no `ъ` key.
2. [`src/common/transliterate.ts:101`](../../src/common/transliterate.ts#L101) uses `this.map[char] || opt.unknown || ''`, which rejects an intentional empty value even when a caller explicitly supplies one with `setData()`.

**Necessary fix:** preserve the distinction between known-empty and missing through generation, generated map population, runtime lookup and resets. Changing only the runtime fallback does not restore deleted generated entries. Add controls confirming genuinely unknown characters still use the placeholder. This finding applies to the no-locale legacy table's silence contract; it does not claim every language treats the hard sign silently.

### 3. #256: capital sharp S is dropped

[GitHub issue #256](https://github.com/yf-hk/transliteration/issues/256)

```js
transliterate('STRAẞE'); // actual "STRAE"; expected "STRASSE"
slugify('STRAẞE');       // actual "strae"; expected "strasse"
```

The lowercase `ß` maps to `ss`, while the capital `ẞ` has no default runtime mapping and a null source-data entry.

**Necessary fix:** add the reviewed uppercase mapping, generate the relevant artifacts, and check full/Latin exports separately. The Latin data selector currently includes only high-byte blocks 0x00–0x02, while U+1E9E is outside that range; a full-table edit alone would not automatically add it to the Latin build. Keep a size guard while defining the Latin repertoire explicitly.

The issue's other examples (`ᴀ`, `ₐ`, `①`) are also dropped in 2.6.2. Those establish additional mapping/compatibility coverage gaps; this audit does not select one universal normalization policy for all compatibility characters.

### 4. #107: Latin capital Y with acute maps to U

[GitHub issue #107](https://github.com/yf-hk/transliteration/issues/107)

```js
transliterate('ýÝ'); // actual "yU"; expected "yY"
```

**Cause:** source data at U+00DD contains the literal mapping `U`. This is a Latin character case-pair defect, not an ambiguity between Cyrillic languages.

**Necessary fix:** correct the source table, regenerate full/Latin artifacts and add the case-pair regression.

## Next: mixed-script spacing, with an explicit compatibility decision

[Open #239](https://github.com/yf-hk/transliteration/issues/239), also related to the [closed historical report #2](https://github.com/yf-hk/transliteration/issues/2).

```js
slugify('hello世界'); // "helloshi-jie"
slugify('你好world'); // "ni-hao-world"
slugify('hello 世界'); // "hello-shi-jie" (explicit-space workaround)
```

The asymmetry is current and reproduced. The implementation inserts a boundary after a Chinese character but does not symmetrically insert it before a Chinese run. The closed #2 example still produces `abcdce-shi` for `abcd测试`, so closure alone does not establish that this behavior is gone.

**Recommended action:** define consistent script-boundary behavior for `fixChineseSpacing`, cover both directions, and decide how to release changed slug output safely. This does not require a general NLP engine.

The separate request in #239 to split every number/letter boundary (including `nihao02`) is a slug-policy feature. Do not treat it as automatically required by the existing Chinese-character spacing contract.

## All 18 open issues

| Issue | Current assessment | Necessary action |
|---|---|---|
| [#256](https://github.com/yf-hk/transliteration/issues/256) capital sharp S / other dropped characters | Confirmed mapping bug for `ẞ`; additional compatibility-character gaps | Fix capital sharp S first; define and test the supported repertoire for the other examples |
| [#253](https://github.com/yf-hk/transliteration/issues/253) Latin bundle same size | **Fixed in published 2.6.2 artifacts** | Close with current artifact evidence; supersede/reconcile PR #255 |
| [#250](https://github.com/yf-hk/transliteration/issues/250) output/source position mapping | Feature request | Roadmap item; no current API contract is broken |
| [#246](https://github.com/yf-hk/transliteration/issues/246) silent hard sign | Confirmed generation and runtime bug | Preserve known-empty mappings through the whole data path |
| [#245](https://github.com/yf-hk/transliteration/issues/245) triple-letter Tamil mappings | Bad linguistic output reproduced; data/algorithm work | Establish a Tamil convention and authoritative fixtures; correcting a few `nnn` entries alone does not implement vowel/virama handling |
| [#243](https://github.com/yf-hk/transliteration/issues/243) Pinyin u versus v | Output-policy/locale feature | Offer an explicit Pinyin convention; avoid a global unreviewed mapping change |
| [#239](https://github.com/yf-hk/transliteration/issues/239) mixed-script and digit boundaries | Reproduced spacing inconsistency plus a separate number-splitting feature | Specify/test both script-boundary directions; treat digit segmentation as a separate policy |
| [#235](https://github.com/yf-hk/transliteration/issues/235) Cyrillic language differences | Language-profile feature / acknowledged limitation | Review opt-in language rules, including PR #257, against a defined standard |
| [#228](https://github.com/yf-hk/transliteration/issues/228) microgram versus Greek mu | Not an unambiguous generic transliteration bug | `µg -> ug`, `μg -> mg` reflects different characters; unit-aware normalization belongs to an explicit domain policy, not changing all Greek mu to u |
| [#155](https://github.com/yf-hk/transliteration/issues/155) ASCII fast path | Performance proposal | Benchmark representative paths and preserve customization semantics before optimizing |
| [#154](https://github.com/yf-hk/transliteration/issues/154) benchmark | Engineering task | Add a maintained benchmark workflow; it is not a reproduced correctness defect |
| [#107](https://github.com/yf-hk/transliteration/issues/107) Y acute becomes U | Confirmed data bug | Correct U+00DD and add case-pair coverage |
| [#101](https://github.com/yf-hk/transliteration/issues/101) supplementary CJK | Confirmed default-data coverage gap | Add trusted supplementary readings and extend generation beyond BMP; runtime already accepts a custom supplementary mapping |
| [#72](https://github.com/yf-hk/transliteration/issues/72) Arabic alif dropped | Bad output reproduced; Arabic source-table/policy issue | Define a source-faithful Arabic spelling profile and validate its data; do not promise full vowel-restored pronunciation as a table patch |
| [#67](https://github.com/yf-hk/transliteration/issues/67) Thai | Reproduced, documented language-quality limitation | Evaluate a proper Thai pipeline/native corpus; PR #254 needs segmentation/coverage review |
| [#65](https://github.com/yf-hk/transliteration/issues/65) Chinese/Japanese/Hanja language selection | Feature / acknowledged language ambiguity | Add explicit opt-in language/reading profiles; a universal character map cannot select all readings |
| [#64](https://github.com/yf-hk/transliteration/issues/64) additional filters | Basic need is already available through replacement/custom data | Explain supported API with an actual control-character example and close if that resolves the request |
| [#14](https://github.com/yf-hk/transliteration/issues/14) separate data and engine | Architecture/packaging feature, partially addressed by Latin build | Keep separate from the immediate bug-fix release; define public data-pack/engine interfaces if proceeding |

## Language symptoms that were observed, without inventing replacement rules

| Input | Published 2.6.2 output | Meaning |
|---|---|---|
| Tamil `கன்னியாகுமரி` | `knnnnnniyaakumri` | The reported quality problem is still present; needs script/language-aware work |
| Arabic `ب ا ب` | `b  b` | The reported alif deletion is still present |
| Thai `เชียงใหม่` | `echiiyngaihm` | The reported RTGS mismatch is still present |
| CJK `𠮷𠬠𡬶𫗭𣛙𢎐` | empty string | Default data is missing; a supplied `𠮷 -> Ji` map works in all three full API variants |
| `2022年中文01英文nihao02` | `2022nian-zhong-wen-01ying-wen-nihao02` | Existing digit-boundary behavior; broader segmentation requires a product decision |

## Issues already resolved or supported in this snapshot

For #253, actual published JavaScript artifact sizes are:

| Target | Full | Latin |
|---|---:|---:|
| Node | 190,610 bytes | 10,251 bytes |
| Browser UMD | 190,836 bytes | 10,477 bytes |
| Browser ESM | 190,123 bytes | 9,778 bytes |

The Node Latin build is below its existing 20 KB guard. These are emitted artifact sizes, not a benchmark of every consumer bundler configuration. PR #255 should not be merged blindly over the already-changed data-injection architecture.

Working controls also confirm CommonJS and ESM named imports of the published `transliteration/latin` subpath (#249), successful loading of the current CommonJS main entry (#247), empty separators (#233), CLI unknown placeholders (#97), the corrected `叶海林 -> Ye Hai Lin` mapping (#229), and the ignored-O-slash spacing case (#26). Those controls are not evidence that every older runtime/browser remains supported.

## Reproduction

```sh
node research/2026-10-22-github-issue-audit/reproduce.mjs --strict
# exits 1 while the confirmed bug assertions fail

node --test test/package.test.mjs
# 13 existing package tests pass against the inspected artifacts
```

The source checkout, npm package integrity, observed values, working controls and distribution comparisons are recorded separately so a future fix can be verified against the same contracts. No implementation fix or release is part of this audit.
