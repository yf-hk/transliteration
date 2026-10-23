import json,pathlib,unicodedata as u,re,collections,hashlib
ROOT=pathlib.Path(__file__).parent
moe=json.load(open(ROOT/'moe-single-character-records.json'))
# Retain only pronunciation facts and record identifiers; definitions are unnecessary.
moe={ch:[{k:v for k,v in row.items() if k in ['A','D','H','I','J','L','M','R']} for row in rows] for ch,rows in moe.items()}
(ROOT/'moe-single-character-records.json').write_text(json.dumps(moe,ensure_ascii=False,indent=2))

def fold(s):return ''.join(c for c in u.normalize('NFD',s.lower()) if not u.combining(c))
def moerecords(r):
 cps=[int(r['codepoint'][2:],16)]
 cps += [int(s[2:],16) for s in re.findall(r'U\+[0-9A-F]+',r['readings'].get('kTraditionalVariant',''))]
 recs=[]
 for cp in cps:
  for rec in moe.get(chr(cp),[]):recs.append({**rec,'lookup_char':chr(cp)})
 return recs

def check(r):
 recs=moerecords(r); accepted=set()
 for rec in recs:
  for prop in ['L','M']:
   accepted.update(fold(x) for x in re.findall(r'[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\u0300-\u036f]+',rec.get(prop,'')))
 r['moe_records']=recs;r['moe_readings']=sorted(accepted)
 r['moe_supports_current']=r['current'].strip().lower() in accepted
 return r
rows=json.load(open(ROOT/'assessed-candidates.json'))
for r in rows:
 check(r)
 if r['valid_other_language_properties']:r['final_assessment']='valid_other_language_reading'
 elif r['moe_supports_current']:r['final_assessment']='valid_moe_regional_historical_alternative'
 elif r['moe_readings']:r['final_assessment']='two_primary_references_mismatch'
 else:r['final_assessment']='unihan_only_unresolved'
 r['suggested_mandarin_default']=fold(r['readings']['kMandarin'].split()[0]).capitalize()
(ROOT/'han-assessed-final.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
counts=collections.Counter(r['final_assessment'] for r in rows);print('FINAL HAN',dict(counts))
for r in rows:
 if r['final_assessment']=='valid_moe_regional_historical_alternative':print('ALT',r['codepoint'],r['char'],r['current'].strip(),r['moe_readings'])
# Reassess customary and corpus preferences with MOE facts, and exclude ties.
for fname in ['customary-default-candidates.json','common-reading-candidates.json']:
 items=json.load(open(ROOT/fname));out=[]
 for r in items:
  if fname.startswith('common'):
   freq=r['corpus_reading_counts']; maximum=max(freq.values())
   if freq.get(r['current'].strip().lower())==maximum:continue
  out.append(check(r))
 (ROOT/fname).write_text(json.dumps(out,ensure_ascii=False,indent=2))
print('prefs',len(json.load(open(ROOT/'customary-default-candidates.json'))),'freq',len(json.load(open(ROOT/'common-reading-candidates.json'))))
