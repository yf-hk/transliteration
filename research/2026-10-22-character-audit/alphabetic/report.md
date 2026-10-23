# Character data audit: U+0000–U+1FFF

Snapshot: 2026-10-22. Report only; no mapping edits. Claude verification is coordinated by the parent task and is pending in this shard.

## Coverage and strength of conclusion

All 8,192 code-point positions were enumerated and all 5,126 non-null table entries were screened by Unicode identity, case relationships, decomposition, script-pattern comparison, or direct inventory review. Of those mappings, 4,814 are nonempty and 312 intentionally or unintentionally empty; 3,066 slots have no table entry. Unicode 17.0.0 identifies 5,125 mapped positions as assigned; U+0D49 is unassigned but has an empty mapping.

This is exhaustive screening, not certification that 5,126 mappings are linguistically correct. A character table cannot recover unmarked vowels, inherent-vowel deletion, context-sensitive consonants, historical pronunciations, Thai/Lao vowel ordering, Korean syllable context, or word readings. Regional and historical alternatives have no single objectively most frequent mapping without a language/domain corpus. Proposed defaults below follow explicit standards and table consistency, not measured usage frequency.

28 candidates are separated by confidence/type. The first 18 entries are direct wrong-letter/wrong-vowel/deletion candidates, followed by 3 casing defects, 3 scheme/context consistency candidates, 2 contextual-sign defects, 1 additional deleted-letter candidate, and 1 specialist-confirmation candidate. All need the requested Sonnet check before final parent reconciliation.

## Per-character candidates

| Unicode | Character | Current | Proposed | Class | Reason |
|---|---|---|---|---|---|
| U+00DD | Ý | 'U' | Y | wrong_letter | Acute accent on Latin Y; lowercase ý maps y and canonical decomposition is Y + acute. |
| U+01F2 | ǲ | 'D' | Dz | dropped_letter | Titlecase DZ digraph decomposes to D z; mapping drops z. |
| U+02B0 | ʰ | 'k' | h | wrong_letter | Modifier small h has compatibility decomposition h, not k. |
| U+03F2 | ϲ | 'c' | s | wrong_letter | Lunate sigma is sigma, not Latin c; ALA-LC explicitly maps ϲ to s. |
| U+0400 | Ѐ | 'Jo' | E (Je if choosing a je convention) | wrong_vowel | This is Е with grave, not Ё/IO; Jo substitutes an o vowel. Ordinary Е maps E. Lowercase ѐ maps je, so case pair also disagrees. |
| U+098C | ঌ | 'RR' | L | wrong_vowel | Bengali VOCALIC L belongs to vocalic l series, not vocalic RR; dependent counterpart U+09E2 maps L. |
| U+09F1 | ৱ | 'r`' | w (or v) | wrong_letter | Despite misleading Unicode formal name RA WITH LOWER DIAGONAL, Unicode identifies this as Assamese wa; r` is the wrong consonant. |
| U+0A2D | ਭ | 'bb' | bh | wrong_letter | Gurmukhi BHA is bha in ALA-LC, consonantal skeleton bh; bb is not the corresponding consonant. |
| U+0E0B | ซ | 'ch' | s | wrong_letter | Thai SO SO is s initially, t finally; ch is not either reading. |
| U+0E45 | ๅ | 'ao' | vowel-length operation (fallback aa) | wrong_vowel | Lakkhangyao lengthens ฤ or ฦ; ao introduces an unrelated o. Unicode calls it a vowel length sign; a correct readable result requires context. |
| U+0E95 | ຕ | 'h' | t | wrong_letter | Lao TO is t, not h; ALA-LC uses t both initially and finally. |
| U+0EAE | ຮ | '' | h | dropped_letter | Lao HO TAM is h initially. Empty string erases an ordinary consonant. |
| U+0698 | ژ | 'j' | zh | wrong_letter | Persian/Pashto JEH is zh, not j; distinct from Arabic JEEM which maps j. |
| U+06A9 | ک | 'kh' | k | wrong_letter | Persian/Urdu keheh is k, not kh; LoC Persian note 2 explicitly shows ک as kaf form. |
| U+06D0 | ې | '' | e | dropped_vowel | Pashto vowel E is romanized e. Empty string deletes a written vowel. |
| U+0685 | څ | 'H' | ts or s (ALA-LC ṡ) | wrong_letter | Pashto letter TSE is represented by ALA-LC ṡ; ts/s depend on dialect. H is not either consonant. |
| U+06AB | ګ | 'K' | g | wrong_letter | Pashto ګ is g in the ALA-LC alphabet; the data uses K. |
| U+05F2 | ײ | 'i' | ey (ay in applicable words) | wrong_vowel | Yiddish double yod represents ey/ay, not i; LoC explicitly lists both diphthongs. Prefer ey as unpointed YIVO default, with ay requiring context/pointing. |
| U+0390 | ΐ | 'I' | i | case_error | Lowercase Greek iota with dialytika and tonos is currently uppercase I, while other lowercase iotas map i. |
| U+0478 | Ѹ | 'u' | U | case_error | Capital Cyrillic UK maps lowercase u, while lowercase U+0479 also maps u; restore the capital U. |
| U+04D0 | Ӑ | 'a' | A | case_error | Capital Cyrillic A with breve maps lowercase a; lowercase U+04D1 maps a. |
| U+038E | Ύ | 'U' | Y (modern/default) or consistent scheme | scheme_inconsistency | Capital upsilon with tonos uses U while unaccented Υ and lowercase ύ use Y/y. U can occur in classical romanization, so this is scheme/case consistency, not universally an impossible reading. |
| U+01B1 | Ʊ | 'Y' | U | scheme_inconsistency | Latin capital upsilon maps Y although its lowercase ʊ maps U (SAMPA-style). Unlike Greek upsilon, this is a Latin IPA/orthographic letter. Needs policy review. |
| U+0AAF | ય | 'ya' | y before vowel signs | context_or_scheme | Gujarati YA uniquely includes inherent a (ya), while neighboring consonants are bare and dependent vowels append, producing duplicate/inappropriate a before explicit vowel signs. Isolated ya itself is a valid romanization. |
| U+0A71 | ੱ | 'H' | double following consonant | context_error | Gurmukhi addak/adhik marks gemination; fixed H inserts unrelated h. ALA-LC specifies doubling the following consonant. |
| U+0651 | ّ | 'W' | double preceding consonant | context_error | Arabic shadda marks gemination; fixed W inserts unrelated w. ALA-LC Persian/Pashto specifies doubling the letter/digraph. |
| U+0B35 | ଵ | '' | v (or w) | dropped_letter | Odia VA is a consonant, not an ignorable sign; data currently drops it. Primary Unicode identity supports nonempty consonantal fallback; preferred scheme needs specialist confirmation. |
| U+095C | ड़ | 'dddh' | r/rr (ASCII of ṛ) | needs_scheme_confirmation | Devanagari DDDHA is the flap ṛ (ड़), not an aspirated dddh sequence. Existing data RRA uses rr. Hindi chart retrieval not yet verified; ask language reviewer. |

## Primary-source evidence

Unicode identities and decompositions: [UnicodeData 17.0.0](https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt), downloaded in this folder. Library of Congress charts are evidence of particular recognized schemes; their values are not asserted to be universal across all language uses of a shared script.

- https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt
- https://www.loc.gov/catdir/cpso/romanization/greek.pdf
- https://www.unicode.org/versions/Unicode16.0.0/UnicodeStandard-16.0.pdf
- https://www.loc.gov/catdir/cpso/romanization/assamese.pdf
- https://www.loc.gov/catdir/cpso/romanization/panjabi.pdf
- https://www.loc.gov/catdir/cpso/romanization/thai.pdf
- https://www.unicode.org/charts/PDF/U0E00.pdf
- https://www.loc.gov/catdir/cpso/romanization/lao.pdf
- https://www.loc.gov/catdir/cpso/romanization/persian.pdf
- https://www.loc.gov/catdir/cpso/romanization/pushto.pdf
- https://www.loc.gov/catdir/cpso/romanization/hebrew.pdf
- https://www.loc.gov/catdir/cpso/romanization/gujarati.pdf

## Rejected automatic false positives and unresolved families

- Case mismatches for Ǝ/ǝ, Ʀ/ʀ, Ʃ/ʃ, Ʒ/ʒ, and Ʌ/ʌ can arise from mixed ASCII phonetic notation (e.g. SAMPA) and ordinary letter folding. Do not mechanically change every mismatch. These need an explicit policy for IPA versus orthographic Latin.
- Micro sign µ → u is a common unit-symbol ASCII fallback, even though NFKD equates it with Greek μ → m. This is not evidence that u is wrong.
- Greek Extended uses e/u where the basic modern Greek block uses i/y. Ancient and Modern Greek differ, and classical upsilon may use u. These are scheme mixing and normalization consistency risks; e and u are not individually impossible romanizations.
- U+1F75 ή and U+03AE ή, and U+1F7B ύ and U+03CD ύ, are canonically equivalent but have different table results. Group these with normalization behavior; do not claim every classical mapping is a linguistic error.
- Cyrillic й → y, х → h, ц → c; Indic c/ch, ss, uppercase R/L, rr/ll/lll; and alternate Armenian/Georgian consonant conventions can all be legitimate transliteration choices. They are not automatically mistakes merely because another standard prefers j/kh/ts or ch/sh.
- Kannada U+0CDE has formal name FA but represents the historical LLLA sound in relevant usage; its lll mapping is not convicted from its formal name. The misleading Assamese name U+09F1 was independently resolved using Unicode prose.
- Empty U+0627 alif/U+05D0 alef can be legitimate as supports/silent letters, but unconditional dropping loses written vowels in other contexts. Empty hard/soft signs and cantillation are also legitimate lossy policy choices.
- Fixed Arabic shadda W and Gurmukhi addak H cannot implement gemination. Their proposed operation requires preceding/following context; replacing each with one Latin letter cannot fully fix them.
- Several archaic Hangul jamo letters are mapped to empty: U+1120, U+113C–U+113F, U+1147, U+114E–U+1151, U+1154–U+1155, U+11EE. They are coverage/deletion gaps requiring an Old Korean scheme; they are not the same as legitimate silent initial ieung U+110B or filler deletion.
- Hebrew base letters bet/kaf/pe/shin need dagesh/sin-dot context, and unpointed words require vowel knowledge. The base p/k/b/sh mappings do not establish that every word is correct or incorrect.
- No native-specialist review of every Syriac, Thaana, Ethiopic, Cherokee, Canadian syllabic, Ogham, Runic, Khmer, Mongolian, or historic character was obtained. Full inventory screening found no additional primary-source-confirmed wrong mapping in those families during this shard.

## Missing coverage

The separate missing-assigned.json enumerates every assigned code point with a null/absent slot in this range. These are coverage gaps, not accusations against existing values. Entire modern blocks are absent, and even otherwise-covered blocks have missing ordinary letters (for example Ethiopic U+12A2). Do not silently count null entries as correct.

| Block | Mapped | Empty | Assigned missing | Assigned letters missing |
|---|---:|---:|---:|---:|
| Basic Latin (U+0000–U+007F) | 128 | 0 | 0 | 0 |
| Latin-1 Supplement (U+0080–U+00FF) | 128 | 33 | 0 | 0 |
| Latin Extended-A (U+0100–U+017F) | 128 | 0 | 0 | 0 |
| Latin Extended-B (U+0180–U+024F) | 208 | 0 | 0 | 0 |
| IPA Extensions (U+0250–U+02AF) | 96 | 0 | 0 | 0 |
| Spacing Modifier Letters (U+02B0–U+02FF) | 63 | 7 | 17 | 0 |
| Combining Diacritical Marks (U+0300–U+036F) | 82 | 82 | 30 | 0 |
| Greek and Coptic (U+0370–U+03FF) | 110 | 3 | 25 | 24 |
| Cyrillic (U+0400–U+04FF) | 238 | 8 | 18 | 17 |
| Cyrillic Supplement (U+0500–U+052F) | 0 | 0 | 48 | 48 |
| Armenian (U+0530–U+058F) | 86 | 0 | 5 | 2 |
| Hebrew (U+0590–U+05FF) | 82 | 38 | 6 | 1 |
| Arabic (U+0600–U+06FF) | 206 | 31 | 50 | 11 |
| Syriac (U+0700–U+074F) | 71 | 5 | 6 | 6 |
| Arabic Supplement (U+0750–U+077F) | 0 | 0 | 48 | 48 |
| Thaana (U+0780–U+07BF) | 49 | 1 | 1 | 1 |
| NKo (U+07C0–U+07FF) | 0 | 0 | 62 | 36 |
| Samaritan (U+0800–U+083F) | 0 | 0 | 61 | 25 |
| Mandaic (U+0840–U+085F) | 0 | 0 | 29 | 25 |
| Syriac Supplement (U+0860–U+086F) | 0 | 0 | 11 | 11 |
| Arabic Extended-B (U+0870–U+089F) | 0 | 0 | 43 | 31 |
| Arabic Extended-A (U+08A0–U+08FF) | 0 | 0 | 96 | 42 |
| Devanagari (U+0900–U+097F) | 104 | 1 | 24 | 16 |
| Bengali (U+0980–U+09FF) | 89 | 2 | 7 | 4 |
| Gurmukhi (U+0A00–U+0A7F) | 75 | 3 | 5 | 0 |
| Gujarati (U+0A80–U+0AFF) | 78 | 1 | 13 | 3 |
| Oriya (U+0B00–U+0B7F) | 80 | 3 | 11 | 1 |
| Tamil (U+0B80–U+0BFF) | 62 | 1 | 10 | 2 |
| Telugu (U+0C00–U+0C7F) | 80 | 1 | 21 | 7 |
| Kannada (U+0C80–U+0CFF) | 80 | 1 | 12 | 6 |
| Malayalam (U+0D00–U+0D7F) | 79 | 2 | 40 | 15 |
| Sinhala (U+0D80–U+0DFF) | 80 | 1 | 11 | 0 |
| Thai (U+0E00–U+0E7F) | 87 | 7 | 0 | 0 |
| Lao (U+0E80–U+0EFF) | 65 | 7 | 18 | 16 |
| Tibetan (U+0F00–U+0FFF) | 192 | 42 | 19 | 3 |
| Myanmar (U+1000–U+109F) | 78 | 1 | 82 | 27 |
| Georgian (U+10A0–U+10FF) | 78 | 0 | 10 | 10 |
| Hangul Jamo (U+1100–U+11FF) | 240 | 16 | 16 | 16 |
| Ethiopic (U+1200–U+137F) | 344 | 0 | 14 | 10 |
| Ethiopic Supplement (U+1380–U+139F) | 0 | 0 | 26 | 16 |
| Cherokee (U+13A0–U+13FF) | 85 | 0 | 7 | 7 |
| Unified Canadian Aboriginal Syllabics (U+1400–U+167F) | 629 | 0 | 11 | 10 |
| Ogham (U+1680–U+169F) | 29 | 0 | 0 | 0 |
| Runic (U+16A0–U+16FF) | 81 | 0 | 8 | 8 |
| Tagalog (U+1700–U+171F) | 0 | 0 | 23 | 19 |
| Hanunoo (U+1720–U+173F) | 0 | 0 | 23 | 18 |
| Buhid (U+1740–U+175F) | 0 | 0 | 20 | 18 |
| Tagbanwa (U+1760–U+177F) | 0 | 0 | 18 | 16 |
| Khmer (U+1780–U+17FF) | 103 | 9 | 11 | 0 |
| Mongolian (U+1800–U+18AF) | 154 | 6 | 4 | 3 |
| Unified Canadian Aboriginal Syllabics Extended (U+18B0–U+18FF) | 0 | 0 | 70 | 70 |
| Limbu (U+1900–U+194F) | 0 | 0 | 68 | 31 |
| Tai Le (U+1950–U+197F) | 0 | 0 | 35 | 35 |
| New Tai Lue (U+1980–U+19DF) | 0 | 0 | 83 | 70 |
| Khmer Symbols (U+19E0–U+19FF) | 0 | 0 | 32 | 0 |
| Buginese (U+1A00–U+1A1F) | 0 | 0 | 30 | 23 |
| Tai Tham (U+1A20–U+1AAF) | 0 | 0 | 127 | 54 |
| Combining Diacritical Marks Extended (U+1AB0–U+1AFF) | 0 | 0 | 58 | 0 |
| Balinese (U+1B00–U+1B7F) | 0 | 0 | 127 | 55 |
| Sundanese (U+1B80–U+1BBF) | 0 | 0 | 64 | 38 |
| Batak (U+1BC0–U+1BFF) | 0 | 0 | 56 | 38 |
| Lepcha (U+1C00–U+1C4F) | 0 | 0 | 74 | 39 |
| Ol Chiki (U+1C50–U+1C7F) | 0 | 0 | 48 | 36 |
| Cyrillic Extended-C (U+1C80–U+1C8F) | 0 | 0 | 11 | 11 |
| Georgian Extended (U+1C90–U+1CBF) | 0 | 0 | 46 | 46 |
| Sundanese Supplement (U+1CC0–U+1CCF) | 0 | 0 | 8 | 0 |
| Vedic Extensions (U+1CD0–U+1CFF) | 0 | 0 | 43 | 13 |
| Phonetic Extensions (U+1D00–U+1D7F) | 0 | 0 | 128 | 128 |
| Phonetic Extensions Supplement (U+1D80–U+1DBF) | 0 | 0 | 64 | 64 |
| Combining Diacritical Marks Supplement (U+1DC0–U+1DFF) | 0 | 0 | 64 | 0 |
| Latin Extended Additional (U+1E00–U+1EFF) | 246 | 0 | 10 | 10 |
| Greek Extended (U+1F00–U+1FFF) | 233 | 0 | 0 | 0 |

## Reproduce

From the repo root: `python3 research/2026-10-22-character-audit/alphabetic/audit.py`, then `build_findings.py`, then `build_report.py`. `audit.py` requires the pinned UnicodeData.txt and Blocks.txt saved in this folder. Its Python unicodedata case/decomposition checks use the interpreter UCD; coverage names/categories use pinned UCD 17.0.0. Raw 10 case anomalies and 187 decomposition anomalies remain available for independent review. No mappings were changed.
