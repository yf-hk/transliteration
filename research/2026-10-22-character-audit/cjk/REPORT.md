# Han, kana and CJK data audit

Audited 22,528 explicit slots: 21,766 nonempty mappings, 35 empty mappings, 727 null slots. The assigned ranges contain 7,040 further absent slots, mainly Extension A. Missing coverage is not a wrong existing romanization. Fullwidth forms were reviewed by the parent audit.

## Confirmed non-Han data errors

| Unicode | Character | Current | Suggested | Evidence |
|---|---|---|---|---|
| U+32D3 | ㋓ | `u` | `e` | CIRCLED KATAKANA E; compatibility decomposition U+30A8 エ. Matches ordinary エ → e and conflicts with previous ㋒ U+32D2 U. |
| U+33A3 | ㎣ | `mm^4` | `mm^3` | SQUARE MM CUBED; compatibility decomposition 006D 006D 00B3. CUBED is exponent 3. Neighboring cm³/m³/km³ correctly use ^3. |
| U+3371 | ㍱ | `HPA` | `hPa` | SQUARE HPA has exact compatibility decomposition U+0068 U+0050 U+0061 (hPa). SI prefix and unit case are significant. |

## Conservative modern Mandarin default recommendations

33 individually listed recommendations follow. They agree with both Unihan and the official MOE 2026-09-29 single-character export (including Unihan simplified-to-traditional links). These are modern Mandarin defaults; a historical or regional reading absent from these sources is not disproved. All raw evidence and lookup record IDs are in `mandarin-default-shortlist.json`.

| Unicode | Character | Current | Suggested |
|---|---|---|---|
| U+5B6C | 孬 | `Huai` | `Nao` |
| U+5BE7 | 寧 | `Zhu` | `Ning` |
| U+60DA | 惚 | `Bu` | `Hu` |
| U+6251 | 扑 | `Bu` | `Pu` |
| U+6482 | 撂 | `Lue` | `Liao` |
| U+65EF | 旯 | `Xu` | `La` |
| U+70C3 | 烃 | `Jing` | `Ting` |
| U+762A | 瘪 | `Pie` | `Bie` |
| U+765F | 癟 | `Pie` | `Bie` |
| U+7845 | 硅 | `Huo` | `Gui` |
| U+7C72 | 籲 | `Xu` | `Yu` |
| U+7EBC | 纼 | `Yin` | `Zhen` |
| U+7ECC | 绌 | `Zhuo` | `Chu` |
| U+7F9F | 羟 | `Qian` | `Qiang` |
| U+82CE | 苎 | `Meng` | `Zhu` |
| U+859B | 薛 | `Xie` | `Xue` |
| U+8934 | 褴 | `Bao` | `Lan` |
| U+8941 | 襁 | `Jiang` | `Qiang` |
| U+9486 | 钆 | `Qiu` | `Ga` |
| U+948C | 钌 | `Diao` | `Liao` |
| U+9496 | 钖 | `Xi` | `Yang` |
| U+94C6 | 铆 | `Liu` | `Mao` |
| U+94CA | 铊 | `She` | `Ta` |
| U+94EA | 铪 | `Jia` | `Ha` |
| U+9507 | 锇 | `Tie` | `E` |
| U+9517 | 锗 | `Duo` | `Zhe` |
| U+9518 | 锘 | `Tian` | `Nuo` |
| U+9536 | 锶 | `Song` | `Si` |
| U+9616 | 阖 | `Ge` | `He` |
| U+97A5 | 鞥 | `Yi` | `Eng` |
| U+9CC0 | 鳀 | `Shi` | `Ti` |
| U+9CCF | 鳏 | `Yin` | `Guan` |
| U+9EE5 | 黥 | `Jing` | `Qing` |

## Every Han mismatch remains available

The initial reference comparison found 1,497 mappings without support in six Unihan Mandarin fields. Full current value, every checked dictionary reading, cross-language support, MOE lookup records, and assessment are retained for each character in `han-assessed-final.json`. Classification counts:

- valid_other_language_reading: 361
- valid_moe_regional_historical_alternative: 160
- unihan_only_unresolved: 766
- two_primary_references_mismatch: 207
- variant_or_language_choice_unresolved: 3

These counts are candidates, not counts of proven errors. Most striking counterexamples to a naive mismatch rule are 械 `Jie`, 携/攜 `Xi`, 蠕 `Ruan`, 酵 `Xiao`, 粳 `Geng`, 癣/癬 `Xian`: official MOE records explicitly support them. They should not be called incorrect globally. 囲 is Japanese shinjitai of 圍; 秔/稉 inherit legitimate `Geng` through 粳.

## Common-reading assessment

734 mappings are a recognized Mandarin reading but differ from Unihan kMandarin customary defaults; exported individually in `customary-default-candidates.json`. kMandarin is an informative stable transliteration/collation default, not a measured global popularity ranking.

105 mappings differ from the highest-frequency reading in Unihan kHanyuPinlu (83 supported alternatives, 22 reference mismatches; tied values excluded). Exact reading counts appear in `common-reading-candidates.json`. This is an older 1,807,389-character corpus across four genres, based in part on the 1986 frequency dictionary; its evidence is useful but not a current worldwide-frequency claim. Strong examples: 了 Liao→Le (30,101 vs 673), 还/還 Huan→Hai (5,894 vs 103), 都 Du→Dou (5,680 vs 93), 着 Zhao→Zhe (10,643 vs 560), 重 Chong→Zhong (1,823 vs 329).

## Scope limits and linguistic context

All 22,528 explicit slots have a ledger row. A matching dictionary reading is supported, not proof that it is the best context-sensitive reading. Japanese small tsu, yōon, vowel length, iteration marks and combining voice marks need sequence handling; changing a single-character replacement cannot make every Japanese word correct. Nihon-shiki-looking si/ti/tu/hu values are valid scheme choices, so they were not mislabeled as typos. Bopomofo spellings match Unicode names; Hanyu Pinyin alternatives such as ao for ㄠ are a scheme question. Symbol translations such as apartment for ㌀ are semantic substitutions and were not treated as misspellings. Historical Korean Jamo require a declared scheme; parent audit covers Korean details.

## Sources and reproducibility

- [Unicode 17 Unihan snapshot](https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip) and [UnicodeData](https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt).
- [UAX #38 property definitions](https://www.unicode.org/reports/tr38/tr38-39.html), especially kMandarin and kHanyuPinlu.
- [Official Ministry of Education export page](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_reviseddict_download.html), `dict_revised_2015_20260929.zip`; source snapshot saved unchanged. Parsed pronunciation facts retain original record IDs.
- `audit.py`, `moe_compare.py`, `finalize.py`, `report.py` reproduce the reference comparisons and reports. `coverage-ledger.json` is exhaustive over explicit assigned slots.

No production mappings were edited. Claude verification is coordinated by the parent audit and is deliberately not claimed in this subreport.
