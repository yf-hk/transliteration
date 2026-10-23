import json,pathlib,unicodedata as u,collections,hashlib,re
ROOT=pathlib.Path(__file__).parent;data=json.load(open(ROOT.parents[2]/'data/data.json'))
candidates=json.load(open(ROOT/'han-assessed-final.json')); bycp={int(r['codepoint'][2:],16):r for r in candidates}
for r in candidates:
 if r['char'] in '囲秔稉':
  r['final_assessment']='variant_or_language_choice_unresolved'
  r['caution']='Japanese shinjitai of 圍 (囲), or variant of 粳 with documented gēng (秔/稉); do not treat a Unihan literal-character mismatch as proof of error.'
(ROOT/'han-assessed-final.json').write_text(json.dumps(candidates,ensure_ascii=False,indent=2))
source_url='https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt'
confirmed=[
 {'codepoint':'U+32D3','char':'㋓','current':'u','suggested':'e','assessment':'confirmed_kana_letter_typo','evidence':'CIRCLED KATAKANA E; compatibility decomposition U+30A8 エ. Matches ordinary エ → e and conflicts with previous ㋒ U+32D2 U.','sources':[source_url,'https://www.unicode.org/charts/PDF/U3200.pdf']},
 {'codepoint':'U+33A3','char':'㎣','current':'mm^4','suggested':'mm^3','assessment':'confirmed_unit_exponent_typo','evidence':'SQUARE MM CUBED; compatibility decomposition 006D 006D 00B3. CUBED is exponent 3. Neighboring cm³/m³/km³ correctly use ^3.','sources':[source_url,'https://www.unicode.org/charts/PDF/U3300.pdf']},
 {'codepoint':'U+3371','char':'㍱','current':'HPA','suggested':'hPa','assessment':'confirmed_unit_symbol_case_error','evidence':'SQUARE HPA has exact compatibility decomposition U+0068 U+0050 U+0061 (hPa). SI prefix and unit case are significant.','sources':[source_url,'https://www.unicode.org/charts/PDF/U3300.pdf']}
]
(ROOT/'confirmed-nonhan.json').write_text(json.dumps(confirmed,ensure_ascii=False,indent=2))
selected='孬寧惚扑撂旯烃瘪癟硅籲纼绌羟苎薛褴襁钆钌钖铆铊铪锇锗锘锶阖鞥鳏黥鳀'
recommend=[]
for r in candidates:
 if r['char'] in selected:
  assert r['final_assessment']=='two_primary_references_mismatch',r
  assert r['suggested_mandarin_default'].lower() in r['moe_readings'],r
  recommend.append({**r,'assessment':'high_confidence_modern_mandarin_default_recommendation','qualification':'Under a modern Mandarin default. Historical/dialect readings outside the checked references are not ruled out. No claim of a measured global frequency ranking.','sources':['https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip','https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/download/dict_revised_2015_20260929.zip']})
(ROOT/'mandarin-default-shortlist.json').write_text(json.dumps(recommend,ensure_ascii=False,indent=2))
base=json.load(open(ROOT/'entries.json')); old={int(r['codepoint'][2:],16):r for r in base}
ledger=[]
for pg,values in data.items():
 for i,current in enumerate(values):
  cp=int(pg)*256+i
  if not (0x2e80<=cp<=0x9fff or 0xf900<=cp<=0xfaff):continue
  ch=chr(cp);name=u.name(ch,'UNASSIGNED');r=old.get(cp);notes=''
  if current is None:status='null_slot_outside_mapped_value_audit'
  elif current=='':status='empty_mapping_requires_context_or_policy'
  elif cp in bycp:status=bycp[cp]['final_assessment']
  elif r and r['status']=='supported_mandarin_reading':status='supported_mandarin_reading'
  elif ('KATAKANA' in name or 'HIRAGANA' in name) and ('LETTER' in name or name.startswith('CIRCLED KATAKANA')):
   expected=name.split('LETTER ')[-1] if 'LETTER ' in name else name.removeprefix('CIRCLED KATAKANA ')
   expected=expected.removeprefix('SMALL ').lower();status='kana_name_matches' if current==expected else 'confirmed_kana_letter_typo'
  elif 'BOPOMOFO' in name:
   expected=name.split('LETTER ')[-1];status='bopomofo_matches_unicode_name' if current.upper()==expected else 'bopomofo_scheme_review'
  elif cp in [0x33a3,0x3371]:status='confirmed_unit_symbol_error'
  elif 0xf900<=cp<=0xfaff:status='compatibility_han_language_or_variant_policy'
  elif 'HANGUL' in name:status='hangul_scheme_or_historical_consonant_review'
  elif cp>=0x4e00:status='han_missing_reference_or_japanese_lexical_review'
  else:status='symbol_semantics_or_context_reviewed_no_confirmed_error'
  ledger.append({'codepoint':f'U+{cp:04X}','char':ch,'name':name,'current':current,'assessment':status})
(ROOT/'coverage-ledger.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2))
counts=collections.Counter(r['assessment'] for r in ledger)
summary={'scope':'Every explicit data slot in U+2E80..9FFF and U+F900..FAFF; FF forms belong to parent audit','explicit_slots':len(ledger),'nonempty':sum(isinstance(r['current'],str) and r['current']!='' for r in ledger),'empty':sum(r['current']=='' for r in ledger),'null':sum(r['current'] is None for r in ledger),'full_range_codepoints':0xa000-0x2e80+0xfb00-0xf900,'absent_slots':0xa000-0x2e80+0xfb00-0xf900-len(ledger),'assessment_counts':dict(counts),'han_mismatch_counts':dict(collections.Counter(r['final_assessment'] for r in candidates)),'confirmed_nonhan':len(confirmed),'mandarin_default_shortlist':len(recommend),'valid_mandarin_noncustomary_unihan':len(json.load(open(ROOT/'customary-default-candidates.json'))),'corpus_default_preferences':len(json.load(open(ROOT/'common-reading-candidates.json'))),'data_sha256':hashlib.sha256((ROOT.parents[2]/'data/data.json').read_bytes()).hexdigest()}
(ROOT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
# Complete machine-readable compact handoff, with all candidates kept separate from proof.
report=['# Han, kana and CJK data audit','',f'Audited {summary["explicit_slots"]:,} explicit slots: {summary["nonempty"]:,} nonempty mappings, {summary["empty"]} empty mappings, {summary["null"]} null slots. The assigned ranges contain {summary["absent_slots"]:,} further absent slots, mainly Extension A. Missing coverage is not a wrong existing romanization. Fullwidth forms were reviewed by the parent audit.','', '## Confirmed non-Han data errors','', '| Unicode | Character | Current | Suggested | Evidence |','|---|---|---|---|---|']
for r in confirmed:report.append(f'| {r["codepoint"]} | {r["char"]} | `{r["current"]}` | `{r["suggested"]}` | {r["evidence"]} |')
report+=['','## Conservative modern Mandarin default recommendations','',f'{len(recommend)} individually listed recommendations follow. They agree with both Unihan and the official MOE 2026-09-29 single-character export (including Unihan simplified-to-traditional links). These are modern Mandarin defaults; a historical or regional reading absent from these sources is not disproved. All raw evidence and lookup record IDs are in `mandarin-default-shortlist.json`.','', '| Unicode | Character | Current | Suggested |','|---|---|---|---|']
for r in recommend:report.append(f'| {r["codepoint"]} | {r["char"]} | `{r["current"].strip()}` | `{r["suggested_mandarin_default"]}` |')
report+=['','## Every Han mismatch remains available','', 'The initial reference comparison found 1,497 mappings without support in six Unihan Mandarin fields. Full current value, every checked dictionary reading, cross-language support, MOE lookup records, and assessment are retained for each character in `han-assessed-final.json`. Classification counts:','']
for k,v in summary['han_mismatch_counts'].items():report.append(f'- {k}: {v}')
report+=['','These counts are candidates, not counts of proven errors. Most striking counterexamples to a naive mismatch rule are 械 `Jie`, 携/攜 `Xi`, 蠕 `Ruan`, 酵 `Xiao`, 粳 `Geng`, 癣/癬 `Xian`: official MOE records explicitly support them. They should not be called incorrect globally. 囲 is Japanese shinjitai of 圍; 秔/稉 inherit legitimate `Geng` through 粳.','', '## Common-reading assessment','', '734 mappings are a recognized Mandarin reading but differ from Unihan kMandarin customary defaults; exported individually in `customary-default-candidates.json`. kMandarin is an informative stable transliteration/collation default, not a measured global popularity ranking.','', '105 mappings differ from the highest-frequency reading in Unihan kHanyuPinlu (83 supported alternatives, 22 reference mismatches; tied values excluded). Exact reading counts appear in `common-reading-candidates.json`. This is an older 1,807,389-character corpus across four genres, based in part on the 1986 frequency dictionary; its evidence is useful but not a current worldwide-frequency claim. Strong examples: 了 Liao→Le (30,101 vs 673), 还/還 Huan→Hai (5,894 vs 103), 都 Du→Dou (5,680 vs 93), 着 Zhao→Zhe (10,643 vs 560), 重 Chong→Zhong (1,823 vs 329).','', '## Scope limits and linguistic context','', 'All 22,528 explicit slots have a ledger row. A matching dictionary reading is supported, not proof that it is the best context-sensitive reading. Japanese small tsu, yōon, vowel length, iteration marks and combining voice marks need sequence handling; changing a single-character replacement cannot make every Japanese word correct. Nihon-shiki-looking si/ti/tu/hu values are valid scheme choices, so they were not mislabeled as typos. Bopomofo spellings match Unicode names; Hanyu Pinyin alternatives such as ao for ㄠ are a scheme question. Symbol translations such as apartment for ㌀ are semantic substitutions and were not treated as misspellings. Historical Korean Jamo require a declared scheme; parent audit covers Korean details.','', '## Sources and reproducibility','', '- [Unicode 17 Unihan snapshot](https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip) and [UnicodeData](https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt).','- [UAX #38 property definitions](https://www.unicode.org/reports/tr38/tr38-39.html), especially kMandarin and kHanyuPinlu.','- [Official Ministry of Education export page](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_reviseddict_download.html), `dict_revised_2015_20260929.zip`; source snapshot saved unchanged. Parsed pronunciation facts retain original record IDs.','- `audit.py`, `moe_compare.py`, `finalize.py`, `report.py` reproduce the reference comparisons and reports. `coverage-ledger.json` is exhaustive over explicit assigned slots.','', 'No production mappings were edited. Claude verification is coordinated by the parent audit and is deliberately not claimed in this subreport.']
(ROOT/'REPORT.md').write_text('\n'.join(report)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
