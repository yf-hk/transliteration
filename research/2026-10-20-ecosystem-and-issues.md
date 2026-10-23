# Transliteration and slugify ecosystem review

**Research date:** 2026-10-20  
**Repository reviewed:** `yf-hk/transliteration`, version `2.6.2`, commit `e69bb1bba461c8e5cab0937f97e0ff602a931885`  
**Scope:** current package capabilities, representative transliteration/slugify libraries across major registries, and the repository's live issue/PR themes.

**Method:** source and generated-artifact inspection, live GitHub issue/PR review, and primary project documentation. No build or test commands were run.

## Executive summary

`transliteration` is a dependency-free JavaScript/TypeScript character-map engine with slug generation, a CLI, browser builds, and a Latin-only entry point. Its full built-in table has 40,258 non-empty BMP entries in the checked-in data; that measures table coverage, not language accuracy. The default generator only visits the BMP, with Hangul computed algorithmically. Mapping individual Unicode code points cannot reliably choose a language reading when the source text is ambiguous or pronunciation depends on word context.

The most consistent user need is **correct, language-appropriate mappings**, followed by **smaller/selectable data bundles** and **better slug boundary control**. A newer, concrete request adds source/output position maps for text alignment. The open tracker also contains long-lived mapping, performance, and filtering reports, so issue count should not be read as a current vote count.

Suggested order:

1. Fix and regression-test the currently reported wrong or missing mappings, beginning with recent/high-impact cases and a maintained multilingual fixture corpus.
2. Complete an opt-in language-rules API and decouple language data from the core engine; preserve today's default output.
3. Land the Latin bundle-size fix and add a reproducible size/performance budget.
4. Add an optional transliteration-to-source offset map.
5. Consider opt-in slug conveniences seen across other ecosystems: max length with word boundaries, Unicode preservation, and script/number boundary handling.
6. Publish a clear script/language support matrix, data provenance, and caveats.

The package's API already has substantial customization. The highest-value work is improving **predictability and language correctness**, rather than adding more global options without a defined behavior contract.

## Current package surface

The workspace's `package.json` identifies version `2.6.2`; the [README](../README.md) documents:

| Area | Present in this snapshot |
|---|---|
| Transliteration | `transliterate()` with custom before/after replacements, ignored strings, whitespace trimming, unknown-character replacement, Chinese spacing behavior, and configurable defaults. |
| Slugging | `slugify()` with the transliteration controls plus lower/upper case, separator, and an `allowedChars` character class. |
| Distribution | Node, browser/CDN, Web Worker, React Native and CLI support; TypeScript declarations; full and `transliteration/latin` package exports. |
| CLI | Separate `transliterate` and `slugify` commands; stdin mode. |
| Runtime | No runtime dependencies; Node 20+ is declared in `package.json`. |

The README describes transliteration as a broad Unicode-to-Latin conversion and names these quality caveats: Chinese polyphonic characters, Japanese Kanji being interpreted through shared Chinese code points, Thai, and Cyrillic language differences. The current `fixChineseSpacing` option inserts spacing; it is not a general word segmenter.

The documented slug API does **not** have dedicated `language`/`locale`, max-length, word-boundary truncation, stopword, slug-counter, or first-class Unicode-preservation options. A configurable character class and ignore/replacement rules can cover some specialized cases, but are not equivalents to all of those policy features. These are feature gaps, not necessarily priorities for a transliteration-focused package.

### Internal module inventory and behavior

The indexed source tree contains one shared transliteration engine and one slug layer, wrapped by separate Node, browser, and CLI entry points. The browser bundles also expose UMD and ES module formats; the package's `./latin` subpath uses a smaller table. This is not a family of separate language-specific transliterators today.

| Module | Responsibility and current limits |
|---|---|
| [`src/common/transliterate.ts`](https://github.com/yf-hk/transliteration/blob/e69bb1bba461c8e5cab0937f97e0ff602a931885/src/common/transliterate.ts#L24-L31) | Shared options and engine: replacements before/after, ignored string spans, per-character map lookup, optional Chinese spacing, trimming, defaults, and custom `setData()`. The main path does not normalize Unicode or choose a language. |
| [`src/common/slugify.ts`](https://github.com/yf-hk/transliteration/blob/e69bb1bba461c8e5cab0937f97e0ff602a931885/src/common/slugify.ts#L42-L73) | Runs transliteration, replaces disallowed character runs with the separator, collapses/removes separator runs at edges, then applies case. It does not split letter/digit transitions or truncate output. |
| [`src/types/index.ts`](https://github.com/yf-hk/transliteration/blob/e69bb1bba461c8e5cab0937f97e0ff602a931885/src/types/index.ts#L10-L72) | Public options include `ignore`, before/after `replace`, `trim`, `unknown`, `fixChineseSpacing`, `lowercase`, `uppercase`, `separator`, and `allowedChars`; there is no `language`, `locale`, offset-map, or unknown-policy type. |
| [`src/node/`](https://github.com/yf-hk/transliteration/tree/e69bb1bba461c8e5cab0937f97e0ff602a931885/src/node) and [`src/browser/`](https://github.com/yf-hk/transliteration/tree/e69bb1bba461c8e5cab0937f97e0ff602a931885/src/browser) | Thin wrappers instantiate the same engine with the full or Latin map. The browser exposes `transl` as an alias; the Node entry point exports `transliterate` and `slugify`. |
| [`src/cli/`](https://github.com/yf-hk/transliteration/tree/e69bb1bba461c8e5cab0937f97e0ff602a931885/src/cli) | Two commands with buffered stdin and a smaller option set. CLI does not expose API options such as `replaceAfter`, `trim`, `fixChineseSpacing`, or `allowedChars`. |
| [`data/data.json`](https://github.com/yf-hk/transliteration/blob/e69bb1bba461c8e5cab0937f97e0ff602a931885/data/data.json) + [`scripts/generate-data.ts`](https://github.com/yf-hk/transliteration/blob/e69bb1bba461c8e5cab0937f97e0ff602a931885/scripts/generate-data.ts#L26-L57) | Source table is converted into high-byte chunks. The generator loops only from high byte `0x00` through `0xFF`, skips Korean blocks because Hangul is computed at runtime, and has no visible provenance/version metadata for the mappings. `setData()` can add custom supplementary characters at runtime, but those are not in the default generated table. |
| [`test/package.test.mjs`](https://github.com/yf-hk/transliteration/blob/e69bb1bba461c8e5cab0937f97e0ff602a931885/test/package.test.mjs#L206-L224) | Existing packaging test requires the Node and browser Latin artifacts to stay under 20 KB and verifies Latin behavior after reset. |

One current semantic bug is visible in the shared engine: [`codeMapReplace()`](https://github.com/yf-hk/transliteration/blob/e69bb1bba461c8e5cab0937f97e0ff602a931885/src/common/transliterate.ts#L87-L102) chooses `this.map[char] || opt.unknown || ''`. An intentional empty mapping therefore falls through to the unknown placeholder. That matches the concern in open issue #246 and affects custom maps as well as built-in silent characters. Use an explicit presence check so “mapped to empty” and “not mapped” remain different states.

The table itself contains examples behind current reports: U+1E9E (`ẞ`) is null, Tamil U+0BA9 maps to `nnn`, and Cyrillic U+044A (`ъ`) maps to an empty string. The generator's BMP limit also explains why rare CJK Extension B characters in issue #101 need a supplementary-plane source rather than another BMP chunk.

The workspace already has a size guard, and its existing `dist` files at inspection time were about 190 KB for the full build and 10 KB for the Latin build. These artifacts were inspected but not rebuilt during this research. Because issue #253 and PR #255 are still open, compare the current source build and published package before assuming the size problem is either fixed or still present.

## Ecosystem scan beyond npm

This landscape cannot be exhaustively enumerated: “transliteration”, “romanization”, “slug”, and “parameterize” overlap, and many frameworks ship small helpers. The table samples established or representative primary projects from major registries and distinguishes full linguistic transforms from slug cleanup. It is not a popularity ranking.

| Ecosystem / project | Relevant capabilities | What it suggests for this package |
|---|---|---|
| **JavaScript — [`@sindresorhus/slugify`](https://github.com/sindresorhus/slugify)** | Locale-aware transliteration, a `transliterate: false` mode to retain Unicode, selectable preserved characters, and `slugifyWithCounter()` for repeated heading IDs. It also delegates language mappings to [`@sindresorhus/transliterate`](https://github.com/sindresorhus/transliterate). | Demonstrates demand for independent slug policy (preserve chars, locale, Unicode passthrough, duplicate IDs) on top of text conversion. Its README does not advertise max-length or stopword controls. |
| **Multi-language ports — [`AnyAscii`](https://github.com/anyascii/anyascii)** | Unicode-to-ASCII mappings are published for C, Elixir, Go, Java, JavaScript, Julia, PHP, Python, Ruby, Rust, Shell, and .NET. Its README explicitly says conversion is character-by-character and context-free. | A direct non-npm transliteration analogue with broad ports; confirms that table coverage and language-correct romanization are separate guarantees. |
| **Python — [`python-slugify`](https://github.com/un33k/python-slugify), [PyPI](https://pypi.org/project/python-slugify/)** | `max_length`, word-boundary truncation, stopwords, custom regex, ordered replacements, HTML entity handling, optional Unicode output, CLI, and selectable transliteration backends (`text-unidecode`, `Unidecode`, `anyascii`). | Strongest slug-policy comparison: max length and word-aware truncation are common practical needs. Backend choice is useful where output tradeoffs differ. |
| **Python — [`Unidecode`](https://github.com/avian2/unidecode), [PyPI](https://pypi.org/project/Unidecode/)** | A broad Unicode-to-ASCII table library, separate from slug policy. Its own documentation warns that results worsen for scripts further from Latin and advises pinning the dependency if transliteration is used to make persistent URLs. | A useful distinction: a large transliteration table is not a guarantee of language-correct romanization. URL output should be stored and treated as durable data. |
| **Ruby — [`babosa`](https://github.com/norman/babosa), [RubyGems](https://rubygems.org/gems/babosa)** | Locale-sensitive transliterators (including German, Greek, Hindi, Cyrillic languages, Turkish and Vietnamese), a composable normalize pipeline, custom transliterators, and truncation by characters or bytes. | Separates transliteration from slug cleanup and supports the database-byte-limit use case. |
| **PHP — [`cocur/slugify`](https://github.com/cocur/slugify), [Packagist](https://packagist.org/packages/cocur/slugify)** | Ordered language rulesets, runtime rule addition, configurable regex, separator, case and trimming, plus framework/template integrations. Its docs call out collisions between language conventions (for example, German versus Turkish umlaut rules). | Ruleset precedence and per-call language choice are established patterns for solving conflicting mappings without silently changing defaults. |
| **Go — [`gosimple/slug`](https://github.com/gosimple/slug), [`pkg.go.dev`](https://pkg.go.dev/github.com/gosimple/slug)** | `MakeLang`, language-specific substitutions, custom string/rune substitutions, uppercase control, and an explicitly restricted ASCII output alphabet. | A small language option can coexist with a clean, fixed slug contract. |
| **Java — [`slugify/slugify`](https://github.com/slugify/slugify), [Maven Central](https://central.sonatype.com/search?q=com.github.slugify%3Aslugify)** | Builder API, locale replacement tables, ordered custom replacements, separator/case controls, and optional ICU4J transliteration. | Shows an optional heavier transliteration backend as a way to add linguistic transforms without forcing that dependency on every consumer. |
| **Rust — [`slugify`](https://docs.rs/slugify/latest/slugify/), [crates.io](https://crates.io/crates/slugify)** | Unicode conversion, custom separator, stopword removal, and maximum length. | Confirms max length and stopwords are independent slug policies, not transliteration features. |
| **Rust — [`slugrs`](https://docs.rs/slugrs/latest/slugrs/), [crates.io](https://crates.io/crates/slugrs)** | Locale-specific German/Turkish/Arabic rules, regex removal, case/trim, maximum length, apostrophe and emoji policies, and batch APIs. | A current example of explicit language and punctuation policy; its batch/parallel API is only relevant if this package's users demonstrate throughput needs. |
| **.NET — [`Slugify.Core`](https://www.nuget.org/packages/Slugify.Core/)** | Basic URL slugging, diacritic handling, and a separate non-ASCII helper. | A useful baseline, but not evidence that .NET slugifiers generally provide deep locale or linguistic handling. |
| **Cross-language engine — [ICU Transforms](https://unicode-org.github.io/icu/userguide/transforms/general/)** | Chained, filtered, script/language transforms with rule-based and contextual mechanisms; official docs explicitly distinguish transliteration from translation and describe ambiguity/pronunciation tradeoffs. | A reference for richer optional language transforms. Its size/runtime costs make an optional backend or generated rule data more plausible than a mandatory dependency here. |

### Repeated ecosystem patterns

- **Slug policy is separate from transliteration.** Max length, word boundaries, stopwords, allowed/preserved characters, and duplicate-ID suffixes operate after or around text conversion.
- **Locale rules matter.** A single Unicode character can have multiple accepted Latin forms depending on language or convention. Other libraries expose locale/ruleset choice rather than promising one universal answer.
- The [Unicode CLDR transliteration guidelines](https://cldr.unicode.org/index/cldr-spec/transliteration-guidelines) describe script-, language-, and standard-specific variants, and treat reversible and lossy transforms as distinct possibilities. This is a sound model for explicit rulesets, not for an unqualified “one correct transliteration.”
- **There are two useful output modes.** Some consumers want ASCII-only paths; others want readable Unicode slugs. Several ecosystems expose an explicit Unicode-preservation or transliteration toggle.
- **Character tables and linguistic conversion are different products.** Large maps solve coverage for many symbols and scripts. They do not resolve polyphonic Han, Japanese Kanji readings, Thai word boundaries, or every language's preferred romanization.

## GitHub issues: direct user signals

The live issue listing showed **18 open issues**. The following groups list all 18 by issue ID and title; the long #245 title is shortened for readability. The interpretation column summarizes what the reporter actually needs.

| Theme | Open issue(s) | Direct signal |
|---|---|---|
| Mapping correctness and coverage | [#256](https://github.com/yf-hk/transliteration/issues/256) “ẞ (U+1E9E capital sharp S) is silently dropped: transliterate(\"STRAẞE\") returns \"STRAE\"”; [#246](https://github.com/yf-hk/transliteration/issues/246) “ъ is mapped to unknown, should be silent instead”; [#245](https://github.com/yf-hk/transliteration/issues/245) “Mappings to triple letters …”; [#243](https://github.com/yf-hk/transliteration/issues/243) “拼音ü替换为u的问题”; [#228](https://github.com/yf-hk/transliteration/issues/228) “μg ≠ mg”; [#107](https://github.com/yf-hk/transliteration/issues/107) “Czech uppercase ‘Ý’ is replaced by ‘U’ instead of ‘Y’”; [#101](https://github.com/yf-hk/transliteration/issues/101) “不支援 𠮷𠬠𡬶𫗭𣛙𢎐 ...這類字”; [#72](https://github.com/yf-hk/transliteration/issues/72) “Arabic alif gets mapped to the empty string” | Users care about whether characters disappear, whether output is linguistically conventional, and whether uppercase/supplementary-plane characters have correct mappings. This is a stronger signal than adding obscure options. |
| Language-aware behavior | [#235](https://github.com/yf-hk/transliteration/issues/235) “Caveats about cyrilic: overlapping characters between languages like Bulgarian or Serbian”; [#67](https://github.com/yf-hk/transliteration/issues/67) “Not working for Thai”; [#65](https://github.com/yf-hk/transliteration/issues/65) “关于中文和日文汉字问题” | Reporters ask for language preference / language-specific transliteration where scripts overlap or words need context. The Thai request names RTGS; its follow-up says traditional Thai does not use spaces to mark every word, limiting rule-only approaches. |
| Slug boundaries | [#239](https://github.com/yf-hk/transliteration/issues/239) “Mixing of numbers and Chinese and English” | The example asks for separators between adjacent numeric, transliterated Chinese, and English runs (`2022-nian-...-01-ying-wen-nihao-02`). A comment shares an `Intl.Segmenter` workaround; the issue remains open. |
| Position mapping | [#250](https://github.com/yf-hk/transliteration/issues/250) “[Feature Request] Generate position mapping while transliterating” | A Storyteller alignment/search use case needs source offsets for matches in romanized text, in both directions. This is a concrete non-slug API need. |
| Data and filtering control | [#14](https://github.com/yf-hk/transliteration/issues/14) “Separate function and data”; [#64](https://github.com/yf-hk/transliteration/issues/64) “Add Additional Filter” | Users want reusable/mixable mappings independent of the conversion engine and a way to drop non-visible ASCII/control characters. |
| Size and speed | [#253](https://github.com/yf-hk/transliteration/issues/253) “Latin same size as bundle”; [#155](https://github.com/yf-hk/transliteration/issues/155) “performance: check if transliteration is needed”; [#154](https://github.com/yf-hk/transliteration/issues/154) “Add a benchmark” | Users want a genuinely small Latin-only artifact and proof that ASCII input avoids unnecessary work. Performance work was requested together with repeatable measurement. |

The [open issue page](https://github.com/yf-hk/transliteration/issues) also shows that many “open” reports date from 2016–2025. Treat those as unresolved reports to audit, not as 18 fresh votes. Recent concrete reports are #256, #253, and #250; older reports with strong continuing relevance include the language-ambiguity and mapping groups.

The full three-page tracker scan covered **86 issue records**, of which 18 were currently open; historical records include auto-closed dependency updates and duplicate reports, so the record count is not a count of unique feature requests. The oldest pages show the following recurring themes:

- **Language-specific transliteration recurs over time:** Bulgarian and Cyrillic variants (#56, #76, #15, #13) connect directly to current #235 and PR #257.
- **Chinese/Japanese ambiguity is persistent:** early Chinese reading/mapping reports (#1, #11, #17, #19, #40, #84) remain consistent with current #65 and the README's Japanese caveat. This supports a language/quality matrix, but not a claim that per-character mapping can solve context-dependent readings.
- **Runtime and packaging compatibility has repeatedly mattered:** older CLI/stdin, Web Worker, React Native, Browserify/RequireJS, and browser/minifier reports (#25, #21, #23, #27, #29, #48, #47) sit in the same product area as recently resolved CJS/export issues #247/#249 and current bundle-size issue #253.
- **Customization and data boundaries are old requests, not new speculation:** custom filtering (#9, #26, #83) and separation of data from engine (#14) recur in current #64 and the bundle-selection requests.

Many of those old records concern tooling that has since changed. Use them as evidence of recurring needs and compatibility risks, then verify the current build or API before treating any individual old bug as still present.

### Older closed requests that still inform the roadmap

- [#230, “Include and Exclude Languages”](https://github.com/yf-hk/transliteration/issues/230) was closed after the reporter clarified they wanted to select script/language data in a build to reduce bundle size. The maintainer said the desired behavior was not then supported and pointed to another module; closure did not mean the requested feature shipped. The current Latin-only entry addresses only one slice of that request.
- [#232, “List of supported languages”](https://github.com/yf-hk/transliteration/issues/232) was closed after the maintainer explained the character-by-character constraint, not after a comprehensive coverage matrix was published.
- [#231, “No Emoji support”](https://github.com/yf-hk/transliteration/issues/231) asked for emoji to remain in text while the rest was transliterated. The discussion provided a regex workaround; there is no documented first-class emoji policy.
- [#226, “Incorrect transliteration for Japanese language”](https://github.com/yf-hk/transliteration/issues/226) remains aligned with the README's current Japanese caveat.
- [#249, Latin subpath import failure](https://github.com/yf-hk/transliteration/issues/249) and [#247, missing CJS output](https://github.com/yf-hk/transliteration/issues/247) were fixed/closed. In #249, the reporter then noted that the Latin import still produced the same-size bundle, which is now tracked separately in #253.
- [#236, “Is reverse transliteration possible?”](https://github.com/yf-hk/transliteration/issues/236) described proper-name conversion in a translation workflow. The maintainer said the data/logic were too complex for this project; this is not a good first-party priority without a separate NLP/phonetic scope.

## Current open PRs and overlap

These PRs were open during the review and should be checked before creating duplicate work:

| PR | Status / scope | Recommendation |
|---|---|---|
| [#257](https://github.com/yf-hk/transliteration/pull/257) | Open; adds opt-in Bulgarian `language: 'bg'` rules and an extensible rule shape with a context resolver. | Review for rule/API design and tests; it directly addresses #235, but its Bulgarian-specific proposal should not silently define all language semantics. |
| [#255](https://github.com/yf-hk/transliteration/pull/255) | Open; excludes the full charmap from Latin chunks; explicitly fixes #253. | Land or supersede, then verify built artifacts and published package contents. |
| [#254](https://github.com/yf-hk/transliteration/pull/254) | Open; Thai RTGS transliteration, tied to #67. Its author states it expects whitespace-separated words and cannot segment traditional unspaced Thai without a dictionary. | Review with a native-speaker corpus and document the segmentation limitation before advertising general Thai support. |
| [#252](https://github.com/yf-hk/transliteration/pull/252) | Open; fixes `allowedChars: undefined`/`null` producing malformed output when optional config is spread. | Treat as a small API robustness fix; this is distinct from the language/data roadmap. |
| [#57](https://github.com/yf-hk/transliteration/pull/57) | Open since 2017; broad language-option proposal. | Historical context for #14/#235; reconcile or close when the newer #257 language-rules approach is settled. |

These statuses are time-sensitive; recheck before implementation planning.

## Recommended updates

### P1 — Correctness and a maintained mapping corpus

Resolve the current reports for dropped/mis-mapped characters and add fixtures covering case pairs, combining sequences, micro sign `µ` versus Greek mu `μ`, punctuation/spacing, and supplementary CJK characters. Start with #256, #245, #246, #243, #228, #107, #101, and #72. Fix empty-map semantics first: distinguish a deliberate `''` mapping from an absent key, so silent letters stay silent even when callers set an unknown placeholder. Keep default output stable where a correction would change URLs; call out mapping changes in release notes.

For each fixture, record source code points, expected output, language/convention, and a trusted source or native-speaker review. That makes corrections reviewable and reduces repeated regressions across generated tables.

### P1 — Opt-in locale rules, with data separate from the engine

Finish the direction represented by #257 and old request #14: a stable `language`/`locale` option whose rules are opt-in, plus a small extension seam for context-sensitive rules. Keep the existing no-locale mapping as the compatibility default. Let per-language data live in separate modules/packages so applications can include only what they need.

This would address Bulgarian/Serbian and Pinyin distinctions more honestly than one global charmap. It cannot fully solve Japanese Kanji readings, polyphonic Chinese, or Thai word segmentation without lexical/context data; state those boundaries explicitly. Avoid describing character-map output as guaranteed pronunciation.

### P1 — Reconcile bundle size and measure the work

Reconcile #253/#255 against a fresh build and the actual published tarball: this workspace already has a `<20 KB` Latin artifact guard, and its existing built files at inspection time were about 10 KB Latin versus 190 KB full. The artifacts were not rebuilt in this research, so treat those sizes as a snapshot, not proof that a release is correct. Add gzip/Brotli and dependency-graph reporting if users still see a large package. Add the #154 benchmark request and consider an ASCII fast path for #155 only after measuring representative ASCII, CJK, and mixed-script inputs.

Once the data is modular, consider script/data subpaths (for example, Latin and chosen script sets) rather than a large number of one-off locale builds. Only add additional prebuilt chunks if package size measurements justify the maintenance cost.

### P2 — Optional source/output offset map

Provide a separate API such as `transliterateWithMap()` returning `{ text, segments }`, where each output segment maps to its source range. Define index units explicitly (JavaScript UTF-16 code units versus Unicode code points), represent one-to-many mappings and removed characters, and test both forward and reverse range queries. Keep ordinary `transliterate()` allocation-free when mapping is not requested. This is grounded directly in #250's alignment use case.

### P2 — Fill selective slug-policy gaps

Consider optional `maxLength` and `wordBoundary` behavior, since multiple non-JS libraries provide them and they are useful for database columns, titles, and IDs. Add stopword removal only if the package wants editorial/article-title slugging. Define whether length means output code points, UTF-16 units, or bytes and whether the separator counts toward the limit.

For #239, consider opt-in word/run segmentation so number, Latin, and transliterated runs receive consistent separators. Do not change the current default implicitly; Chinese spacing and language segmentation are product choices, and `Intl.Segmenter` availability/locale behavior should be isolated behind an option.

If Unicode slugs or emoji retention are in scope, add explicit `allowUnicode` / `emoji` policies rather than asking users to encode them in `allowedChars` and `ignore`. Keep ASCII-safe URLs as the default.

### P2 — Publish an honest support matrix

Document by **script and language/convention**, not by claiming every language is supported. For each entry, state whether the behavior is simple code-point mapping, language-specific rules, or contextual/lexical transliteration; give examples, known ambiguity, and references to standards. Mark data completeness and known unsupported ranges. This answers the earlier #232 question and improves the current README caveats.

Add a short durability note: slug output can change when the mapping data changes; applications that expose permanent URLs should store generated slugs and treat table corrections as migration-sensitive changes.

### P3 — Close the CLI/API gap

Once the API stabilizes, decide which useful controls should also be available as CLI flags. Today the CLI omits `replaceAfter`, `trim`, `fixChineseSpacing`, and `allowedChars`; a future `language` option would also need an explicit CLI decision. Keep this lower priority than correcting the data and defining locale behavior.

## Source list

- Workspace [README](../README.md), [`package.json`](../package.json), engine, slug layer, type definitions, generators, and packaging test linked in the module inventory.
- Live [GitHub issue list](https://github.com/yf-hk/transliteration/issues) and individual issue/PR links embedded above.
- Primary upstream project docs/repositories and registries linked in the ecosystem table.

