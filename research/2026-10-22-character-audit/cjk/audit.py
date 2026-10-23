import json,zipfile,unicodedata as u,re,collections,pathlib,hashlib
ROOT=pathlib.Path(__file__).parent
DATA=ROOT.parents[2]/'data/data.json'
data=json.load(open(DATA)); readings=collections.defaultdict(dict)
with zipfile.ZipFile(ROOT/'Unihan.zip') as z:
 for fname in ['Unihan_Readings.txt','Unihan_Variants.txt']:
  for line in z.read(fname).decode().splitlines():
   if not line.startswith('U+'): continue
   cp,prop,val=line.split('\t'); readings[int(cp[2:],16)][prop]=val

def fold(s):
 # Preserve umlaut distinction: data convention is Lu/Lue rather than Lv/Lve.
 return ''.join(x for x in u.normalize('NFD',s.lower()) if not u.combining(x)).replace('ü','u')

def options(props):
 vals=[]
 for k,v in props.items():
  if k=='kMandarin': vals+=v.split()
  if k in ['kHanyuPinyin','kXHC1983','kTGHZ2013']:
   vals += [p for item in v.split() for p in item.split(':',1)[-1].split(',')]
  if k=='kSMSZD2003Readings': vals += [item.split('粵')[0] for item in v.split()]
  if k=='kHanyuPinlu': vals += re.findall(r'([^\s()]+)\(\d+\)',v)
 return sorted(set(map(fold,vals)))
rows=[]; mismatches=[]
for pg,vs in data.items():
 for i,val in enumerate(vs):
  cp=int(pg)*256+i
  if not (0x2e80<=cp<=0x9fff or 0xf900<=cp<=0xfaff or 0xff00<=cp<=0xffef): continue
  name=u.name(chr(cp),'UNASSIGNED')
  if not ('CJK' in name or 'IDEOGRAPH' in name or 'HIRAGANA' in name or 'KATAKANA' in name): continue
  props=readings[cp]; opts=options(props)
  row=dict(codepoint=f'U+{cp:04X}',char=chr(cp),name=name,current=val,readings=props,accepted_readings=opts)
  if val is None: row['status']='null_slot'
  elif 'LETTER' in name and ('KATAKANA' in name or 'HIRAGANA' in name):
   expected=name.split('LETTER ')[-1].replace('SMALL ','').lower()
   row['expected_from_name']=expected
   row['status']='kana_matches_name' if val.lower()==expected else 'kana_review'
  elif ('CJK' in name or 'IDEOGRAPH' in name) and opts:
   row['status']='supported_mandarin_reading' if val.strip().lower() in opts else 'han_reading_mismatch'
  else: row['status']='no_mandarin_or_nonletter'
  rows.append(row)
  if row['status'] in ['han_reading_mismatch','kana_review']: mismatches.append(row)
(ROOT/'entries.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
(ROOT/'raw-candidates.json').write_text(json.dumps(mismatches,ensure_ascii=False,indent=2))
counts=collections.Counter(r['status'] for r in rows)
(ROOT/'summary.json').write_text(json.dumps(dict(counts),indent=2))
print(dict(counts)); print('candidates',len(mismatches))

