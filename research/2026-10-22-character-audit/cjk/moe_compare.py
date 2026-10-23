import json,zipfile,io,xml.etree.ElementTree as E,collections,re,unicodedata as u,pathlib
ROOT=pathlib.Path(__file__).parent
ns='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
with zipfile.ZipFile(ROOT/'MOE-revised-20260929.zip') as z: data=z.read('dict_revised_2015_20260929.xlsx')
with zipfile.ZipFile(io.BytesIO(data)) as z:
 ss=[]
 for _,e in E.iterparse(z.open('xl/sharedStrings.xml'),events=['end']):
  if e.tag==ns+'si':
   ss.append(''.join(x.text or '' for x in e.iter(ns+'t')));e.clear()
 singles=collections.defaultdict(list)
 for _,e in E.iterparse(z.open('xl/worksheets/sheet1.xml'),events=['end']):
  if e.tag!=ns+'row': continue
  row={}
  for c in e:
   v=c.find(ns+'v')
   if v is None:continue
   col=re.sub(r'\d','',c.attrib['r']);row[col]=ss[int(v.text)] if c.attrib.get('t')=='s' else v.text
  if e.attrib['r']=='1': print('headers',row)
  # character row: first column 字詞名, pinyin I (determine from header)
  if len(row.get('A',''))==1: singles[row['A']].append({k:v for k,v in row.items() if k in ['A','D','H','I','J','L','M','R']})
  e.clear()
print('single keys',len(singles))
(ROOT/'moe-single-character-records.json').write_text(json.dumps(singles,ensure_ascii=False,indent=2))
print('Pronunciation-only facts saved; definitions excluded.')
