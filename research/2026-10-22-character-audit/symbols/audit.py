import json,unicodedata as u,collections,pathlib
ROOT=pathlib.Path(__file__).resolve().parent
D=json.load(open(ROOT.parents[2]/'data/data.json'))
M={int(p)*256+i:v for p,a in D.items() for i,v in enumerate(a)}
def assigned(n):return not(n<=0x1fff or 0x2e80<=n<=0x9fff or 0xac00<=n<=0xd7a3 or 0xf900<=n<=0xfaff or 0xff00<=n<=0xffef)
rows=[]; candidates=[]
for n,v in M.items():
 if not assigned(n):continue
 ch=chr(n); name=u.name(ch,'UNASSIGNED'); norm=u.normalize('NFKD',ch); ref=''.join((M.get(ord(c)) or '') if ord(c) in M else c for c in norm)
 r=dict(cp=f'U+{n:04X}',character=ch,name=name,current=v,nfkd=norm,nfkd_mapping=ref,category=u.category(ch),page=n//256,index=n%256)
 rows.append(r)
 if name.startswith(('YI SYLLABLE ','YI RADICAL ')):
  expected=name.split(' ',2)[2].lower()
  if (v or '').lower()!=expected:candidates.append(dict(r,rule='Yi standard syllable/radical name mismatch',expected=expected))
 if norm!=ch and (v or '').strip()!=ref.strip(): candidates.append(dict(r,rule='NFKD mapped-output mismatch'))
 if 0xa700<=n<=0xa7ff and v:candidates.append(dict(r,rule='Historic Latin manual review'))
json.dump(rows,open(ROOT/'inventory.json','w'),ensure_ascii=False,indent=2)
json.dump(candidates,open(ROOT/'raw-candidates.json','w'),ensure_ascii=False,indent=2)
summary=dict(unicode_version=u.unidata_version,total=len(rows),nonempty=sum(bool(r['current']) for r in rows),empty=sum(not r['current'] for r in rows),named=sum(r['name']!='UNASSIGNED' for r in rows),pages=dict(collections.Counter(r['page'] for r in rows)),candidates=len(candidates))
json.dump(summary,open(ROOT/'summary.json','w'),indent=2)
print(summary)
