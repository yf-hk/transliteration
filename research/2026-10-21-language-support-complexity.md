# Chinese, Korean, Thai, and Arabic support: complexity assessment

**Date:** 2026-10-21  
**Source snapshot:** version 2.6.2, commit `e69bb1bba461c8e5cab0937f97e0ff602a931885`  
**Method:** current source inspection, illustrative calls against the source API, and primary standards/library documentation. No source implementation was changed and no full build or test suite was run.

## What “full support” can reasonably mean

Good support for a named romanization scheme is achievable. Correct pronunciation and preferred names for every possible input cannot be guaranteed from spelling alone. The practical release promise should identify the language variety, scheme, supported input forms, output conventions, and fallback behavior.

For this package, I recommend these initial targets:

| Language | Bounded target | Engineering difficulty | Planning estimate |
|---|---|---|---|
| Korean | Modern Hangul, Revised Romanization, cross-syllable rules and common exceptions | Medium; the most compact starting point | 2–4 engineer-weeks |
| Chinese | Modern Mandarin Hanyu Pinyin, Simplified/Traditional input, phrase dictionaries and explicit overrides | High; lexical data and ambiguity dominate | 4–8 engineer-weeks |
| Thai | Central Thai RTGS on ordinary unsegmented text, word/syllable analysis and lexical exceptions | Very high; segmentation and pronunciation both need work | 6–12 engineer-weeks |
| Arabic, written form | An explicit orthographic scheme such as Buckwalter/Safe Buckwalter, preserving information actually written | Low to medium; finite mappings plus normalization and mark handling | 2–4 engineer-weeks |
| Arabic, inferred pronunciation | Readable romanization of ordinary unvocalized MSA, with contextual vowel restoration | Very high; a separate NLP subsystem | At least several months; roughly 3–6+ months for an initial model-backed product scope |

These are my engineering estimates, not measured implementation times. They assume one experienced engineer, access to fluent reviewers, reuse of existing data/algorithms, Node and browser packaging, and meaningful acceptance cases. They exclude creating a new lexicon, training a new model, all dialects, and universal proper-name correctness. Shared profile/API/data infrastructure adds approximately 1–2 weeks. The four bounded targets total roughly 15–30 engineer-weeks including that shared work; the Arabic pronunciation target is additional.

An adapter to an existing specialist engine can yield a demonstration much sooner. Owning a stable browser-compatible implementation, data updates, output compatibility, and language quality is the larger commitment.

## What the current implementation does

The [shared engine](https://github.com/yf-hk/transliteration/blob/e69bb1bba461c8e5cab0937f97e0ff602a931885/src/common/transliterate.ts#L69-L120) maps individual code points and adds a Chinese-spacing heuristic. [Hangul tables](https://github.com/yf-hk/transliteration/blob/e69bb1bba461c8e5cab0937f97e0ff602a931885/data/charmap.ts#L132-L135) compose each modern syllable's Latin letters independently. The [data generator](https://github.com/yf-hk/transliteration/blob/e69bb1bba461c8e5cab0937f97e0ff602a931885/scripts/generate-data.ts#L26-L57) only builds BMP tables. Runtime custom maps can already accept supplementary characters; the default dataset pipeline is the limit there.

Illustrative calls against the current source:

| Input | Current output | What a language profile needs to change |
|---|---|---|
| Chinese `重庆银行` | `Chong Qing Yin Xing` | Select `hang` for the bank sense of 行; choose phrase/word spacing separately. |
| Korean `한국` | `hangug` | RR word-final consonant handling gives `Hanguk`. |
| Korean `종로` | `jongro` | RR assimilation gives `Jongno`. |
| Korean `신라` | `sinra` | RR assimilation gives `Silla`. |
| Thai `สามารถ` | `saamaarth` | RTGS gives `samat`; a silent letter and final-consonant rules matter. |
| Arabic `كتب` | `ktb` | A written-form mapping can legitimately retain the consonant sequence; adding the intended vowels is a separate inference task. |
| Vocalized Arabic `مُحَمَّد` | `muHamaWd` | Interpret combining marks and shadda as part of a syllable/consonant sequence, rather than emit an independent `W`. |

The Korean targets are documented by [NIKL](https://www.korean.go.kr/front_eng/roman/roman_01.do); the Thai target appears explicitly in the [government-published Thai romanization rules](https://assets.publishing.service.gov.uk/media/5ab4e60aed915d78b9a459f5/ROMANIZATION_OF_THAI.pdf).

I also compared each of the 11,172 modern precomposed Hangul syllables with its Unicode NFD decomposition through the current source API: **zero output differences**. The existing Jamo mappings therefore already provide useful modern normalization equivalence in this experiment. A new context engine must preserve it. This does not establish coverage of archaic or free-standing compatibility Jamo, or correct RR pronunciation.

## Chinese: a dictionary and context problem

Choose Mandarin Hanyu Pinyin as the first named profile. “Chinese” also includes varieties with different reading systems: [Jyutping](https://lshk.org/jyutping-scheme/) is a distinct Cantonese scheme. A Mandarin profile should not claim to produce Cantonese readings.

The main work is selecting readings for multi-pronunciation characters from phrases and context, supporting Traditional and Simplified lexical forms, handling surnames/place names, and expanding rare-character data beyond the BMP. Pinyin also needs explicit conventions for tones, `ü`, word spelling, apostrophes, capitalization, and names. These output decisions belong to a scheme profile; ASCII slug folding comes afterward. [GB/T 16159-2012](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=5645BD8DB9D8D73053AD3A2397E15E74) is the orthography reference.

Existing specialists demonstrate the architecture: [pypinyin](https://github.com/mozillazg/python-pinyin) has character and phrase datasets; [pinyin-pro](https://pinyin-pro.cn/use/addDict.html) explicitly adds dictionaries to improve readings of unfamiliar phrases. Its publisher reports optional dictionaries of approximately **0.6 MB and 3.99 MB gzipped**. Those are upstream figures, not measurements or predicted sizes for this package; they show why a richer profile should be optional.

A phrase lexicon plus overrides can give strong practical slugging without a neural model. Unseen names and short ambiguous inputs still need an override or an explicitly chosen fallback. High-confidence natural pronunciation across arbitrary genres is a continuing language-data product.

## Korean: manageable rules, with lexical exceptions

Retain arithmetic Hangul decomposition and add a language engine operating across syllables. RR changes final consonants and adjacent sounds, including assimilation and palatalization. It also has exceptions depending on word/morpheme structure, so a few local substitutions do not implement the whole standard. [NIKL's official rules](https://www.korean.go.kr/front_eng/roman/roman_01.do) provide the normative examples.

This is the best first implementation because the modern syllable inventory is finite, much of the machinery already exists, and the ordinary Hangul path can remain compact. Work includes rule ordering, word boundaries, compound exceptions, input-form equivalence, and an exception/override mechanism.

Hanja is an additional dictionary problem: Korean readings must replace the default Mandarin-oriented Han mapping. Preferred personal/company spellings are also separate from computed RR; NIKL explicitly permits established spellings. Limit the initial promise to modern Hangul under RR, with name overrides. Archaic Hangul and alternate schemes can follow separately.

## Thai: the largest deterministic language-engine project

RTGS is based on pronunciation. Thai ordinarily omits word boundaries; written order can differ from spoken order; consonants have different initial/final values; silent letters and implicit vowels require analysis. The [official BGN/PCGN publication](https://assets.publishing.service.gov.uk/media/5ab4e60aed915d78b9a459f5/ROMANIZATION_OF_THAI.pdf) explicitly calls for pronunciation dictionaries or authoritative name spellings. RTGS also omits tone and vowel-length distinctions, so standard RTGS is not a full pronunciation or reversible representation.

The pipeline needs word segmentation, syllable parsing, pronunciation rules, and dictionary exceptions. [ICU](https://unicode-org.github.io/icu/userguide/boundaryanalysis/) uses dictionaries for Thai word boundaries, but finding a word boundary does not itself determine the correct romanization.

[PyThaiNLP](https://pythainlp.org/docs/5.3/api/transliterate.html) offers rule, dictionary, toolkit, and neural engines, with examples where their output differs. Its Python/PyTorch/ONNX options are reference implementations or optional backends, rather than direct imports into this package's synchronous browser API.

[PR #254](https://github.com/yf-hk/transliteration/pull/254) remains open and says it expects whitespace-separated words. It may contribute rules, but its stated limitation leaves ordinary unsegmented Thai unresolved. A credible Thai release needs an unsegmented native-reviewed corpus, including irregular words and names.

## Arabic: decide whether the product supplies unwritten vowels

Deterministic written-form transliteration is tractable. [CAMeL Tools](https://camel-tools.readthedocs.io/en/latest/api/utils/charmap.html) supplies explicit Arabic/Buckwalter/Safe Buckwalter mappings. A browser-friendly implementation can handle letters, written vowel marks, shadda, hamza forms, digits, and compatibility forms without a language model. Buckwalter output is an orthographic encoding; it should not be advertised as ordinary readable pronunciation.

Readable romanization is a different scope. Arabic normally omits short vowel marks, as the [Unicode FAQ](https://unicode.org/faq/arabic.html) explains. A character mapper cannot recover information absent from the string. Even [ALA-LC romanization](https://www.loc.gov/catdir/cpso/romanization/arabic.pdf) has contextual and grammatical rules; implementing its letter chart alone does not implement the scheme.

For unvocalized MSA, vowel restoration needs lexical/morphological analysis and context, often with a trained disambiguator. [CAMeL's BERT disambiguator](https://camel-tools.readthedocs.io/en/latest/api/disambig/bert.html) combines models and a morphological analyzer, with separate MSA/Egyptian/Gulf models. [ACL research](https://aclanthology.org/2024.acl-long.792/) treats partial diacritization as an active NLP task. This is substantial data/runtime scope and still has ambiguity; dialects and established name spellings add further variation.

For the first release, provide an explicitly named written-form mode and correctly handle vocalized input. Make any vowel-restoring pronunciation engine an optional, separately evaluated capability.

## Architecture and delivery recommendation

1. **Add an explicit profile boundary.** Select language variety and scheme; let each profile consume whole runs or tokens. Preserve source ranges through normalization and segmentation where needed. A per-character override hook alone is insufficient for Thai and contextual Chinese.
2. **Keep linguistic output before slug cleanup.** Generate the selected Latin representation first, then apply tone/diacritic folding, ASCII rules, word separators, and case. Otherwise the slug layer can discard distinctions needed by the language engine.
3. **Make data and heavy engines optional.** Korean can be primarily rules; Mandarin and Thai need lexical data; Arabic vowel inference needs a separate model-backed path. Keep those assets out of the default bundle and define their versions and loading lifecycle.
4. **Provide phrase/name overrides and explicit fallback behavior.** Some input is genuinely ambiguous. A single string API needs a deterministic fallback; callers with authoritative names need a way to supply them.
5. **Release against named acceptance corpora.** Cover common words, compounds, names, mixed scripts, marks, unsupported characters, and Unicode input forms. Measure linguistic quality separately from byte coverage, performance, and package size.

I would deliver modern Korean RR first, Mandarin Pinyin second, and basic Arabic written-form support in parallel where possible. Thai should be its own focused project. Arabic pronunciation restoration belongs to a later optional NLP integration. This yields useful, accurately scoped support without claiming universal pronunciations or preferred personal-name spellings.
