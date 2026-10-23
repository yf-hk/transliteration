import json,unicodedata as u,pathlib,collections
root=pathlib.Path(__file__).parent;p=json.load(open('data/data.json'))
def m(c):
 cp=ord(c);a=p.get(str(cp//256));return a[cp%256] if a and cp%256<len(a) else None
rows=[];case=[];decomp=[]
for cp in range(8192):
 c=chr(cp);v=m(c);name=u.name(c,'UNASSIGNED');row={'cp':f'U+{cp:04X}','char':c,'name':name,'mapping':v,'category':u.category(c)};rows.append(row)
 if v is None:continue
 pair=c.lower()
 if pair!=c and len(pair)==1 and m(pair) is not None and v.lower()!=m(pair).lower():case.append({**row,'lower_cp':f'U+{ord(pair):04X}','lower_mapping':m(pair)})
 d=u.normalize('NFKD',c)
 if d!=c and all(m(x) is not None for x in d):
  expected=''.join(m(x) for x in d if not u.combining(x))
  if expected.lower()!=v.lower():decomp.append({**row,'decomposition':d,'decomposed_mapping':expected})
(root/'inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
(root/'case-anomalies.json').write_text(json.dumps(case,ensure_ascii=False,indent=2))
(root/'decomposition-anomalies.json').write_text(json.dumps(decomp,ensure_ascii=False,indent=2))
with (root/'inventory.txt').open('w') as f:
 for r in rows:
  if r['mapping'] is not None:f.write(f"{r['cp']} {r['char']} {r['mapping']!r} {r['name']}\n")
print('positions',len(rows),'mapped',sum(r['mapping'] is not None for r in rows),'assigned mapped',sum(r['mapping'] is not None and r['name']!='UNASSIGNED' for r in rows),'case anomalies',len(case),'decomposition anomalies',len(decomp))
print('CASE',json.dumps(case,ensure_ascii=False));print('DECOMP',json.dumps(decomp,ensure_ascii=False))
# Refresh inventory identity against the downloaded pinned UCD, since Python's UCD
# version can differ from the audit baseline.
ud={int(line.split(';')[0],16):line.split(';') for line in (root/'UnicodeData.txt').read_text().splitlines()}
for row in rows:
 cp=int(row['cp'][2:],16);rec=ud.get(cp)
 row['name']=rec[1] if rec else 'UNASSIGNED'
 row['category']=rec[2] if rec else 'Cn'
(root/'inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
(root/'missing-assigned.json').write_text(json.dumps([r for r in rows if r['mapping'] is None and r['category']!='Cn'],ensure_ascii=False,indent=2))
blocks=[]
for line in (root/'Blocks.txt').read_text().splitlines():
 line=line.split('#')[0].strip()
 if not line:continue
 span,name=line.split(';');a,b=[int(x,16) for x in span.strip().split('..')]
 if a>=8192:break
 rr=rows[a:min(b+1,8192)]
 blocks.append(dict(block=name.strip(),range=f'U+{a:04X}–U+{min(b,8191):04X}',positions=len(rr),mapped=sum(x['mapping'] is not None for x in rr),empty=sum(x['mapping']=='' for x in rr),missing_assigned=sum(x['mapping'] is None and x['category']!='Cn' for x in rr),missing_assigned_letters=sum(x['mapping'] is None and x['category'].startswith('L') for x in rr)))
coverage=dict(unicode_version='17.0.0',positions=8192,non_null_mappings=sum(x['mapping'] is not None for x in rows),nonempty_mappings=sum(x['mapping'] not in (None,'') for x in rows),empty_mappings=sum(x['mapping']=='' for x in rows),missing_slots=sum(x['mapping'] is None for x in rows),mapped_assigned=sum(x['mapping'] is not None and x['category']!='Cn' for x in rows),mapped_unassigned=[x['cp'] for x in rows if x['mapping'] is not None and x['category']=='Cn'],blocks=blocks)
(root/'coverage.json').write_text(json.dumps(coverage,indent=2))
