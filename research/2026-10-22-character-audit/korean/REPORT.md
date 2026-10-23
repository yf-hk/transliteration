# Hangul and fullwidth audit

Snapshot: 2026-10-22. Source: `data/data.json`, SHA-256 `ed678e3d8e46f7976e32187e9c0d2231ce19a128e4807d2d700380129a11588d`.

## Hangul: consistent data, different romanization convention

All 11,172 modern Hangul syllables U+AC00–U+D7A3 exactly match their lowercase Unicode character-name syllable strings. No individual corruption was found by that check. Unicode character names identify characters; they do not certify ordinary Korean pronunciation or a preferred romanization.

The [National Institute of Korean Language's official romanization rules](https://www.korean.go.kr/front_eng/roman/roman_01.do) use `kk`, `tt`, `pp`, `ch`, `wo`, and `ui` where this table uses `gg`, `dd`, `bb`, `c`, `weo`, and `yi`. Changing just those onset/vowel choices affects **3,192 distinct syllables**, individually enumerated in `scheme-differences.json`. This is a conditional comparison with Revised Romanization (RR), not 3,192 convention-independent typos. The `proposed_onset_vowel_only` field deliberately retains the existing final consonant and is **not** a complete RR replacement.

Examples:

| Unicode | Character | Current | RR example |
|---|---|---|---|
| U+AE4C | 까 | gga | kka |
| U+B530 | 따 | dda | tta |
| U+BE60 | 빠 | bba | ppa |
| U+CC28 | 차 | ca | cha |
| U+C6CC | 워 | weo | wo |
| U+C758 | 의 | yi | ui |

Final consonants and cross-syllable sound changes cause additional differences. For example, 각 is stored as `gag`, whereas an isolated final ㄱ is transcribed `k` under RR (`gak`). Ordinary word transcription also needs assimilation and other contextual rules. A character-only table cannot implement the full official scheme. A language/scheme decision must precede any wholesale replacement; no corpus-based claim about a globally most frequent spelling is made here.

## Fullwidth/halfwidth forms

All 240 stored slots U+FF00–U+FFEF were screened: 221 nonempty, two empty, 17 null. The ten discrepancies between direct mapping and NFKC-then-mapping are listed in `fullwidth-candidates.json`. Fullwidth ASCII letters, digits and ordinary punctuation match their ASCII equivalents.

The discrepancies include spacing, voiced/prolonged kana marks, cent/won symbol renderings, and geometric symbols. They are not ten proven linguistic errors. For example U+FFE0 uses `/C` while U+00A2 uses `C/`; both are recognizable visual cent-sign approximations, although inconsistent. U+FF70 is a vowel-length mark: a correct reading needs the preceding kana. Rendering it `+` is a literal fallback rather than ordinary Japanese romanization. Similarly U+FF9E/U+FF9F require composition with the preceding kana; `:`/`;` do not express the resulting voiced/semi-voiced syllable.

Reproduce with `python3 research/2026-10-22-character-audit/inventory.py`. Python's Unicode 16.0 naming/normalization library is recorded in `coverage-summary.json`; these stable Hangul/fullwidth characters are also covered by the other workers' downloaded Unicode 17.0 evidence.
