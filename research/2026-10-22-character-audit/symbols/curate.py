import json,pathlib,collections
P=pathlib.Path(__file__).resolve().parent
R=json.load(open(P/'inventory.json')); idx={r['cp']:r for r in R}; findings=[]
latin='https://www.unicode.org/charts/PDF/UA720.pdf'; heb='https://www.unicode.org/charts/PDF/UFB00.pdf'; loc='https://www.loc.gov/catdir/cpso/romanization/hebrew.pdf'; yi='https://www.unicode.org/charts/PDF/UA000.pdf'
def add(cp,suggested,status,why,sources):
 findings.append(dict(idx[cp],suggested=suggested,status=status,reason=why,sources=sources))
for cp,v in [('U+A771','dum'),('U+A772','lum'),('U+A773','mum')]:add(cp,v,'confirmed_wrong','Medieval Latin abbreviation expansion is shifted to preceding character; Unicode identifies the intended expansion.',[latin])
for cp,v in [('U+FB27','r'),('U+FB3E','m'),('U+FB41','s')]:add(cp,v,'confirmed_wrong','Unicode decomposition identifies a different consonant from the current output; LC romanization confirms the suggested consonant.',[heb,loc])
add('U+FB47','q','confirmed_wrong','Current ts denotes tsadi, while the character is qof. q preserves the existing base table scheme; k follows common modern Hebrew pronunciation and LC dotted-k convention.',[heb,loc])
add('U+A015','repeat the preceding Yi syllable','confirmed_context_required','Unicode explicitly identifies this as a syllable iteration mark and calls the name YI SYLLABLE WU a misnomer; fixed wu is not the linguistic reading.',[yi])
for cp,v,why in [('U+FB35','u','Usually shuruk u; consonantal v with dagesh is a context-dependent alternate.'),('U+FB4B','o','Usually holam-vav o; consonantal vo is a context-dependent alternate.'),('U+FB4C','v','Bet with rafe is soft bet/vet in common modern Hebrew; b is an orthographic base-letter policy.'),('U+FB4D','kh','Kaf with rafe is soft kaf/khaf; k is an orthographic base-letter policy.'),('U+FB4E','f','Pe with rafe is soft pe/fe; p is an orthographic base-letter policy.')]:add(cp,v,'common_reading_recommendation',why,[heb,loc])
add('U+A7FF','M or Manius','scheme_semantic_review','Unicode calls this archaic M and a logograph for Manius; M1 might be a legacy disambiguation marker, not a pronunciation. Do not call this proven wrong without establishing the intended output policy.',[latin])
for cp in ['U+A768','U+A769']:add(cp,'V/v or W/w depending historical reading','scheme_semantic_review','Current Y/y visually resembles vend but is doubtful as a historical phonetic reading. Primary chart names vend without a reading; insufficient source verification for confirmed status.',[latin])
for cp in ['U+A4A2','U+A4A3','U+A4B4','U+A4C1','U+A4C5']:add(cp,idx[cp]['name'].replace('YI RADICAL ','').title(),'missing_mapping','Five valid named Yi radicals are null while neighboring radical names are mapped.', ['https://www.unicode.org/charts/PDF/UA490.pdf'])
missing=[dict(r,reason='Empty/null table entry has a nonempty NFKD-plus-existing-table result; reference is orthographic, not independently validated pronunciation',suggested=r['nfkd_mapping']) for r in R if not r['current'] and r['nfkd']!=r['character'] and r['nfkd_mapping'].strip()]
json.dump(findings,open(P/'findings.json','w'),indent=2,ensure_ascii=False)
json.dump(missing,open(P/'missing-compatibility.json','w'),indent=2,ensure_ascii=False)
summary=json.load(open(P/'summary.json'));summary.update(finding_status_counts=dict(collections.Counter(f['status'] for f in findings)),missing_compatibility_count=len(missing),yi_syllable_name_matches=1165,yi_syllable_semantic_exceptions=['U+A015'],yi_radicals_named=55,yi_radicals_nonempty=50)
json.dump(summary,open(P/'summary.json','w'),indent=2)
print(summary)
