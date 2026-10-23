# Character romanization audit

**Snapshot: 2026-10-22. This audit did not edit production mappings.**

Screened all **45,056 stored slots** in `data/data.json`: **40,258 nonempty mappings**, 1,745 empty strings and 3,053 nulls across 176 pages. Three parallel subagents (the maximum available) audited separate ranges; the parent checked Hangul/fullwidth forms, runtime parity, and reconciliation. Source commit: `e69bb1bba461c8e5cab0937f97e0ff602a931885`.

The reconciled report contains **31 well-supported data defects** (28 wrong nonempty values and 3 ordinary letters deleted), **33 qualified modern Mandarin default recommendations**, and **105 corpus-frequency candidates**. Sonnet favors changing 82 of those 105 defaults and retains or questions 23. These groups overlap and must not be summed into a unique error count.

**Concurrent workspace edits:** the live source changed during review. These findings refer to [the exact frozen audited snapshot](source-data.json). The final [live recheck](live-recheck.json) finds 1 correction(s) already present, 30 unchanged defects, and 0 other changed confirmed-defect values; it also checks all 33 Mandarin recommendations. Concurrent production edits were preserved and are not attributed to this audit.

Every stored value was screened, but this is not native-speaker certification of every language and rare historical reading. Unresolved characters are explicitly listed. Reference agreement establishes a documented reading, not that it is correct in every word.

## Confirmed mapping defects

All entries below have primary identity/romanization evidence and were independently accepted by **Claude Sonnet 5.5 at medium effort**. Case corrections assume the case-preserving behavior used by neighboring entries. Empty output is shown as `""`. Suggestions are ASCII outputs under the documented language or table convention; alternate schemes can choose different spellings.

| Unicode | Character | Current | Suggested | Finding |
|---|---|---|---|---|
| U+00DD | Ý | `"U"` | `Y` | Acute accent on Latin Y; lowercase ý maps y and canonical decomposition is Y + acute. |
| U+01F2 | ǲ | `"D"` | `Dz` | Titlecase DZ digraph decomposes to D z; mapping drops z. |
| U+02B0 | ʰ | `"k"` | `h` | Modifier small h has compatibility decomposition h, not k. |
| U+0390 | ΐ | `"I"` | `i` | Lowercase Greek iota with dialytika and tonos is currently uppercase I, while other lowercase iotas map i. |
| U+03F2 | ϲ | `"c"` | `s` | Lunate sigma is sigma, not Latin c; ALA-LC explicitly maps ϲ to s. |
| U+0400 | Ѐ | `"Jo"` | `E` | This is Е with grave, not Ё/IO; Jo substitutes an o vowel. Ordinary Е maps E. Lowercase ѐ maps je, so case pair also disagrees. |
| U+0478 | Ѹ | `"u"` | `U` | Capital Cyrillic UK maps lowercase u, while lowercase U+0479 also maps u; restore the capital U. |
| U+04D0 | Ӑ | `"a"` | `A` | Capital Cyrillic A with breve maps lowercase a; lowercase U+04D1 maps a. |
| U+05F2 | ײ | `"i"` | `ey` | Yiddish double yod represents ey/ay, not i; LoC explicitly lists both diphthongs. Prefer ey as unpointed YIVO default, with ay requiring context/pointing. |
| U+0685 | څ | `"H"` | `ts` | Pashto letter TSE is represented by ALA-LC ṡ; ts/s depend on dialect. H is not either consonant. |
| U+06A9 | ک | `"kh"` | `k` | Persian/Urdu keheh is k, not kh; LoC Persian note 2 explicitly shows ک as kaf form. |
| U+06AB | ګ | `"K"` | `g` | Pashto ګ is g in the ALA-LC alphabet; the data uses K. |
| U+06D0 | ې | `""` | `e` | Pashto vowel E is romanized e. Empty string deletes a written vowel. |
| U+095C | ड़ | `"dddh"` | `r` | Devanagari DDDHA is the flap ṛ (ड़), not an aspirated dddh sequence. Existing data RRA uses rr. Hindi chart retrieval not yet verified; ask language reviewer. |
| U+098C | ঌ | `"RR"` | `L` | Bengali VOCALIC L belongs to vocalic l series, not vocalic RR; dependent counterpart U+09E2 maps L. |
| U+09F1 | ৱ | `"r`"` | `w` | Despite misleading Unicode formal name RA WITH LOWER DIAGONAL, Unicode identifies this as Assamese wa; r` is the wrong consonant. |
| U+0A2D | ਭ | `"bb"` | `bh` | Gurmukhi BHA is bha in ALA-LC, consonantal skeleton bh; bb is not the corresponding consonant. |
| U+0B35 | ଵ | `""` | `v` | Odia VA is a consonant, not an ignorable sign; data currently drops it. Primary Unicode identity supports nonempty consonantal fallback; preferred scheme needs specialist confirmation. |
| U+0E0B | ซ | `"ch"` | `s` | Thai SO SO is s initially, t finally; ch is not either reading. |
| U+0E95 | ຕ | `"h"` | `t` | Lao TO is t, not h; ALA-LC uses t both initially and finally. |
| U+0EAE | ຮ | `""` | `h` | Lao HO TAM is h initially. Empty string erases an ordinary consonant. |
| U+32D3 | ㋓ | `"u"` | `e` | CIRCLED KATAKANA E; compatibility decomposition U+30A8 エ. Matches ordinary エ → e and conflicts with previous ㋒ U+32D2 U. |
| U+3371 | ㍱ | `"HPA"` | `hPa` | SQUARE HPA has exact compatibility decomposition U+0068 U+0050 U+0061 (hPa). SI prefix and unit case are significant. |
| U+33A3 | ㎣ | `"mm^4"` | `mm^3` | SQUARE MM CUBED; compatibility decomposition 006D 006D 00B3. CUBED is exponent 3. Neighboring cm³/m³/km³ correctly use ^3. |
| U+A771 | ꝱ | `"us"` | `dum` | Medieval Latin abbreviation expansion is shifted to preceding character; Unicode identifies the intended expansion. |
| U+A772 | ꝲ | `"dum"` | `lum` | Medieval Latin abbreviation expansion is shifted to preceding character; Unicode identifies the intended expansion. |
| U+A773 | ꝳ | `"lum"` | `mum` | Medieval Latin abbreviation expansion is shifted to preceding character; Unicode identifies the intended expansion. |
| U+FB27 | ﬧ | `"m"` | `r` | Unicode decomposition identifies a different consonant from the current output; LC romanization confirms the suggested consonant. |
| U+FB3E | מּ | `"l"` | `m` | Unicode decomposition identifies a different consonant from the current output; LC romanization confirms the suggested consonant. |
| U+FB41 | סּ | `"n"` | `s` | Unicode decomposition identifies a different consonant from the current output; LC romanization confirms the suggested consonant. |
| U+FB47 | קּ | `"ts"` | `q` | Current ts denotes tsadi, while the character is qof. q preserves the existing base table scheme; k follows common modern Hebrew pronunciation and LC dotted-k convention. |

[Machine-readable corrections, sources and reviewer reasoning](confirmed-errors.csv). [JSON version](confirmed-errors.json).

U+095C ड़ was additionally verified against the [2025 Library of Congress Hindi chart](https://www.loc.gov/catdir/cpso/romanization/hindi.pdf), which gives the flap ṛa; `dddh` is not that romanization. Choosing `r` versus a distinguishable `rr`/`R` is a table policy decision.

## Modern Mandarin defaults

These 33 recommendations agree with the frozen Unihan and official Taiwan Ministry of Education dictionary evidence. Sonnet reviewed all 33 separately after that crosscheck. They are recommendations for **ordinary modern Mandarin**, not proof that no older, dialectal or other-language reading ever existed. Tones and trailing table spaces are omitted below.

| Unicode | Character | Current | Recommended | Sonnet assessment |
|---|---|---|---|---|
| U+5B6C | 孬 | `Huai` | `Nao` | accepts modern correction |
| U+5BE7 | 寧 | `Zhu` | `Ning` | accepts modern correction |
| U+60DA | 惚 | `Bu` | `Hu` | accepts modern correction |
| U+6251 | 扑 | `Bu` | `Pu` | accepts modern correction |
| U+6482 | 撂 | `Lue` | `Liao` | prefers modern default; historical caution |
| U+65EF | 旯 | `Xu` | `La` | accepts modern correction |
| U+70C3 | 烃 | `Jing` | `Ting` | accepts modern correction |
| U+762A | 瘪 | `Pie` | `Bie` | accepts modern correction |
| U+765F | 癟 | `Pie` | `Bie` | accepts modern correction |
| U+7845 | 硅 | `Huo` | `Gui` | prefers modern default; historical caution |
| U+7C72 | 籲 | `Xu` | `Yu` | prefers modern default; historical caution |
| U+7EBC | 纼 | `Yin` | `Zhen` | accepts modern correction |
| U+7ECC | 绌 | `Zhuo` | `Chu` | prefers modern default; historical caution |
| U+7F9F | 羟 | `Qian` | `Qiang` | accepts modern correction |
| U+82CE | 苎 | `Meng` | `Zhu` | accepts modern correction |
| U+859B | 薛 | `Xie` | `Xue` | accepts modern correction |
| U+8934 | 褴 | `Bao` | `Lan` | accepts modern correction |
| U+8941 | 襁 | `Jiang` | `Qiang` | prefers modern default; historical caution |
| U+9486 | 钆 | `Qiu` | `Ga` | accepts modern correction |
| U+948C | 钌 | `Diao` | `Liao` | accepts modern correction |
| U+9496 | 钖 | `Xi` | `Yang` | accepts modern correction |
| U+94C6 | 铆 | `Liu` | `Mao` | prefers modern default; historical caution |
| U+94CA | 铊 | `She` | `Ta` | prefers modern default; historical caution |
| U+94EA | 铪 | `Jia` | `Ha` | prefers modern default; historical caution |
| U+9507 | 锇 | `Tie` | `E` | accepts modern correction |
| U+9517 | 锗 | `Duo` | `Zhe` | accepts modern correction |
| U+9518 | 锘 | `Tian` | `Nuo` | accepts modern correction |
| U+9536 | 锶 | `Song` | `Si` | accepts modern correction |
| U+9616 | 阖 | `Ge` | `He` | accepts modern correction |
| U+97A5 | 鞥 | `Yi` | `Eng` | accepts modern correction |
| U+9CC0 | 鳀 | `Shi` | `Ti` | accepts modern correction |
| U+9CCF | 鳏 | `Yin` | `Guan` | accepts modern correction |
| U+9EE5 | 黥 | `Jing` | `Qing` | accepts modern correction |

[All 33 recommendations with dictionary evidence and Sonnet reasoning](mandarin-defaults.csv). Source records and variant lookup IDs are retained in [the underlying JSON](cjk/mandarin-default-shortlist.json).

## Most common reading when several are valid

We used Unihan `kHanyuPinlu` reading counts where available, and kept valid alternatives separate from wrong-letter defects. These counts come from an older, limited corpus, not contemporary worldwide usage. A dictionary headword, an isolated-character fallback and the most frequent reading in running text can differ.

| Character | Current | Corpus-supported default | Evidence |
|---|---|---|---|
| 了 | Liao | Le | le 30,101; liao 673 |
| 还 / 還 | Huan | Hai | hai 5,894; huan 103 |
| 都 | Du | Dou | dou 5,680; du 93 |
| 着 | Zhao | Zhe | zhe 10,643; zhao 560; zhuo 125 |
| 重 | Chong | Zhong | zhong 1,823; chong 329 |

[Every one of the 105 frequency candidates](common-reading-review.csv) includes counts and Sonnet's individual decision: 82 prefer-default, 16 retain valid alternative, 7 unresolved. For example, 佛 `Fo` should not be changed automatically to `Fu` just because 仿佛 dominates this corpus; 儿/兒 `r` reflects a suffix and does not replace isolated `Er`. The reviewer's contextual explanations are model judgment, not independently measured frequency evidence.

A further [734 dictionary-default differences](cjk/customary-default-candidates.json) have individually documented alternatives. These are not 734 errors: `kMandarin` is a customary dictionary/collation default, not a popularity measurement.

## Chinese candidates and rejected false positives

The complete [per-character Han candidate ledger](han-candidates.csv) and [full primary records](cjk/han-assessed-final.json) retain all **1,497** initial mismatches:

| Final primary-evidence category | Characters |
|---|---:|
| Documented other-language reading | 361 |
| Valid MOE regional/historical reading | 160 |
| Variant or language-choice caution | 3 |
| Disagrees with both primary references; candidate, not automatically proven wrong | 207 |
| Only Unihan evidence; unresolved | 766 |

Sonnet reviewed all 1,136 candidates that lacked direct other-language matches, but its raw labels do **not** override the later MOE/variant checks. The 33 defaults above are a conservative subset of the reference-mismatch pool. The remaining candidates need additional dialect/historical/variant evidence before changing production data. Valid existing examples include 械 `Jie`, 携/攜 `Xi`, 蠕 `Ruan`, 酵 `Xiao`, 粳 `Geng`, and 癣/癬 `Xian`; a Unihan-only mismatch would wrongly convict them. 囲 `Wei` also has a Japanese shinjitai relationship to 圍.

## Contextual failures and scheme differences

| Unicode | Current | Required assessment |
|---|---|---|
| U+0651 ّ | W | Shadda doubles the preceding consonant; a fixed W does not implement that. |
| U+0A71 ੱ | H | Addak doubles the following consonant; a fixed H does not implement that. |
| U+0E45 ๅ | ao | Thai vowel-length operation; depends on the preceding sign. No verified universal single-string correction. |
| U+A015 ꀕ | wu | Yi iteration mark; repeat the preceding syllable. The Unicode name WU is a documented misnomer. |
| U+FF70 ｰ | + | Japanese vowel length needs preceding kana context. |
| U+FF9E ﾞ / U+FF9F ﾟ | : / ; | Compose with the preceding kana to obtain voiced/semi-voiced syllables. |

Sonnet confirmed the contextual nature of the first four. The halfwidth-kana cases follow the character identities/composition check; they were not submitted as standalone fixed replacements. These require sequence handling rather than an invented Latin fallback. Base Arabic/Hebrew vowels and Indic inherent vowels also need word or language context.

All **11,172 Hangul syllables** exactly match lowercase Unicode syllable names. Those spellings form a consistent scheme, but differ from official Korean Revised Romanization. Changing onset/vowel choices alone affects **3,192 syllables** (`gg/kk`, `dd/tt`, `bb/pp`, `c/ch`, `weo/wo`, `yi/ui`). Sonnet explicitly rejected calling that whole range erroneous. Final consonants and sound changes need further context. See [Hangul/fullwidth report](korean/REPORT.md) and [every affected syllable](korean/scheme-differences.json).

Other choices held for policy/specialist review: Greek Ύ `U/Y`; Latin Ʊ `Y/U`; Gujarati ય inherent `a`; medieval Latin vend U+A768/U+A769 `Y/y`; archaic M U+A7FF `M1/M`; and pointed Hebrew presentation forms whose common readings can differ from base-letter folding. The [core Sonnet review](sonnet/core.parsed.json) preserves the individual judgments.

## Missing support

The audit also identified [916 empty/null compatibility-form mappings](symbols/missing-compatibility.json), mostly Arabic presentation forms and enclosed characters, and five missing Yi radicals (U+A4A2, U+A4A3, U+A4B4, U+A4C1, U+A4C5). All have per-character records. Compatibility decompositions suggest useful fallback outputs, but those are **mechanical proposals, not validated gold readings**: at least 20 propagate already-suspect base mappings, and Arabic vowel recovery remains unresolved. See the [independent challenge](symbols/independent-alphabetic-challenge.md).

Null/absent support is distinct from a wrong existing nonempty value. Combining marks, controls, fillers and silent signs can legitimately map to empty; this report does not count every empty string as a defect. Entire absent Unicode blocks and supplementary planes are outside the existing-data correctness claim. [Alphabetic missing-assigned inventory](alphabetic/missing-assigned.json) and shard reports document additional coverage gaps.

## Verification and reproducibility

- [Coverage ledger](coverage.csv): one row for every stored slot, with page-derived code point, value state and audit partition. [Coverage totals](coverage-summary.json).
- [Runtime check](runtime-data-parity.json): all 45,056 stored slots reproduced the expected current output from the existing built package, with Chinese trailing-space trimming and runtime Hangul generation accounted for. **Zero mismatches.** This proves that suspect data reaches output; it does not certify its linguistic correctness.
- Audited `data/data.json` SHA-256: `ed678e3d8e46f7976e32187e9c0d2231ce19a128e4807d2d700380129a11588d`. Exact source recovered from the matching Git commit and saved as `source-data.json`; snapshot hash verified after reconciliation. This audit did not edit production code/data. Concurrent workspace changes and existing unrelated research were preserved; see `live-recheck.json` for the distinct live hash.
- [Claude reconciliation receipts](sonnet/reconciliation.json): exact `claude-sonnet-5-5`, requested `--effort medium`, successful model identity receipts and complete input/output row reconciliation for all six packets. Raw prompts, replies and receipts are retained in `sonnet/`. Models had no tools: source evidence came from the auditors, and model agreement was never treated as primary proof.
- Frozen [Unicode 17.0 Unihan](https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip), [UnicodeData](https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt), [UAX #38 property definitions](https://www.unicode.org/reports/tr38/tr38-39.html), [official MOE export page](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_reviseddict_download.html), Library of Congress script charts, and [official Korean romanization](https://www.korean.go.kr/front_eng/roman/roman_01.do). Download provenance and hashes are in [cjk/provenance.json](cjk/provenance.json); exact chart links appear on correction rows and shard reports.
- Reproduce inventories with `inventory.py`, `alphabetic/audit.py`, `symbols/audit.py`, and the CJK scripts described in [cjk/REPORT.md](cjk/REPORT.md). `build_report.py` regenerates the reconciled report from frozen findings and model responses; `consult_sonnet.py` documents the exact review invocation.

Detailed shards: [Alphabetic/scripts](alphabetic/report.md), [CJK](cjk/REPORT.md), [Symbols/historic](symbols/REPORT.md), [Hangul/fullwidth](korean/REPORT.md).
