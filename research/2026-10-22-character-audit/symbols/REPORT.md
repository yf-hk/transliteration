# Symbols, Yi, historic Latin, and presentation-form audit

Audit date: 2026-10-22. No mapping data changed.

## Scope and evidence

Every stored slot outside U+0000–1FFF, U+2E80–9FFF, U+AC00–D7A3, U+F900–FAFF, and U+FF00–FFEF was decoded as decimal page × 256 + index. This covers 4,460 slots: 2,285 nonempty mappings, 1,396 explicit empty strings, and 779 null values. Python Unicode 16.0 metadata recognizes 4,214 named characters. The current official Unicode charts were browsed for suspected errors; their shared URLs currently return Unicode 18 charts. Conclusions concern longstanding characters present in both versions.

All slots are in `inventory.json`; `audit.py` reproduces inventory and raw checks. `curate.py` reproduces the classified findings and missing compatibility list. `runtime-samples.json` records actual output from the existing local distribution for 17 representative characters; it confirms that errors and missing entries are observable output behavior. No Unicode normalization rescues the empty compatibility forms in those samples.

## Confirmed incorrect mappings

| Code point | Character | Current | Suggested | Reason |
|---|---|---|---|---|
| U+A771 | ꝱ | us | dum | Wrong medieval abbreviation expansion. |
| U+A772 | ꝲ | dum | lum | Wrong medieval abbreviation expansion. |
| U+A773 | ꝳ | lum | mum | Wrong medieval abbreviation expansion. |
| U+FB27 | ﬧ | m | r | Wide resh is resh, not mem. |
| U+FB3E | מּ | l | m | Mem with dagesh is mem, not lamed. |
| U+FB41 | סּ | n | s | Samekh with dagesh is samekh, not nun. |
| U+FB47 | קּ | ts | q, or k for modern pronunciation | Qof is distinct from tsadi. q matches this table's ordinary qof; k matches common modern pronunciation. |

The Latin identifications follow the [Unicode Latin Extended-D chart](https://www.unicode.org/charts/PDF/UA720.pdf). Hebrew consonant identities and decompositions follow the [Unicode presentation-form chart](https://www.unicode.org/charts/PDF/UFB00.pdf); the [Library of Congress Hebrew romanization table](https://www.loc.gov/catdir/cpso/romanization/hebrew.pdf) confirms consonant readings.

U+A015 ꀕ currently maps to `wu`, but the [Unicode Yi chart](https://www.unicode.org/charts/PDF/UA000.pdf) identifies it as a syllable iteration mark and explicitly warns that its permanent Unicode name is misleading. Correct linguistic output repeats the preceding syllable; there is no universal replacement string. This is a contextual defect distinct from the seven incorrect fixed strings.

## Common-reading recommendations

| Code point | Current | Common modern Hebrew reading | Qualification |
|---|---|---|---|
| U+FB35 וּ | v | u | Usually shuruk; consonantal v with dagesh is possible in context. |
| U+FB4B וֹ | vo | o | Usually holam-vav; consonantal vo is possible in context. |
| U+FB4C בֿ | b | v | Rafe marks the soft consonant. |
| U+FB4D כֿ | k | kh | Rafe marks the soft consonant. |
| U+FB4E פֿ | p | f | Rafe marks the soft consonant. |

These follow the [LC pronunciation-oriented table](https://www.loc.gov/catdir/cpso/romanization/hebrew.pdf). An explicitly orthographic system may retain base consonants, so these are policy-sensitive recommendations. No corpus frequency measurement was performed; “common” describes conventional modern readings rather than a counted majority.

U+A7FF ꟿ → `M1` is a scheme/semantic review item. Unicode identifies an archaic M used as a Manius logograph; `M` or `Manius` are plausible outputs, but `M1` might be legacy disambiguation. U+A768/U+A769 vend → `Y/y` are also unresolved historical-reading candidates. None of these three is counted as a confirmed error.

## Missing mappings

Five named Yi radicals are null while adjacent radical names are supported: U+A4A2 `Zup`, U+A4A3 `Cyt`, U+A4B4 `Nzup`, U+A4C1 `Zur`, and U+A4C5 `Nbie`. Their names are verified in the [Unicode Yi radicals chart](https://www.unicode.org/charts/PDF/UA490.pdf).

`missing-compatibility.json` lists **916** additional empty/null slots whose compatibility decomposition has a nonempty mapped result. These include enclosed Latin letters/numbers, subscript letters, letterlike symbols, Arabic presentation forms/ligatures, and vertical punctuation. For example, ① becomes empty rather than 1, and Arabic isolated beh ﺏ becomes empty rather than the b produced for ordinary beh. The suggestions in this file preserve the existing base-letter table and are not independently verified Arabic pronunciations. Some are symbols or abbreviations rather than linguistic romanization. These are omissions, not 916 incorrect existing nonempty romanizations.

## Coverage and limits

All 1,165 Yi syllable entries match Unicode's romanized names mechanically. U+A015 illustrates why that comparison alone is insufficient; its contextual exception was separately identified. All 55 Yi radicals were checked against their names: 50 existing outputs agree apart from capitalization and five are absent. All 256 braille entries were inspected as a convention: the six-dot entries use Braille ASCII-style values, while the 192 seven/eight-dot entries encode dot numbers. Those identifiers are not universal spoken or language-specific braille readings. Symbols, arrows, drawing characters and punctuation use intentionally lossy visual approximations; differences from normalization are not automatically defects.

Historic Latin entries received name/shape and decomposition screening; several phonetic symbols and medieval abbreviations are inherently context/scheme-dependent. The 1,123 raw candidates include intentional ASCII approximations and missing mappings, so that count is not a defect count. Empty unmapped modern script additions, unassigned code points, combining marks, and the Hangul tail beyond U+D7A3 were inventoried but cannot all be assigned a universal romanization. This report does not certify native-language or corpus-level correctness of every Unicode character.
