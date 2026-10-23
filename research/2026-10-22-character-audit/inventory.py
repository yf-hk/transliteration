"""Reproduce coverage and Hangul/fullwidth checks without changing source data."""
import csv
import hashlib
import json
import unicodedata as ud
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source-data.json'
raw = SOURCE.read_bytes()
data = json.loads(raw)

def lookup(cp):
    page = data.get(str(cp >> 8), [])
    return page[cp & 255] if len(page) > (cp & 255) else None

def partition(cp):
    if cp < 0x2000:
        return 'alphabetic'
    if 0x2E80 <= cp <= 0x9FFF or 0xF900 <= cp <= 0xFAFF:
        return 'cjk'
    if 0xAC00 <= cp <= 0xD7A3:
        return 'korean'
    if 0xFF00 <= cp <= 0xFFEF:
        return 'fullwidth'
    return 'symbols'

rows = []
for page, values in data.items():
    for offset, value in enumerate(values):
        cp = int(page) * 256 + offset
        display = chr(cp) if not ud.category(chr(cp)).startswith('C') else f'\\u{cp:04X}'
        rows.append(dict(codepoint=f'U+{cp:04X}', char=display,
                         name=ud.name(chr(cp), '<unassigned or control>'),
                         current=value, partition=partition(cp),
                         state='null' if value is None else 'empty' if value == '' else 'nonempty'))
with (ROOT / 'coverage.csv').open('w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0]))
    w.writeheader()
    w.writerows(dict(row, current=json.dumps(row['current'], ensure_ascii=False)) for row in rows)

summary = dict(source='data/data.json', sha256=hashlib.sha256(raw).hexdigest(),
               naming_library_unicode_version=ud.unidata_version,
               pages=len(data), slots=len(rows),
               states=dict(Counter(r['state'] for r in rows)),
               partitions={p: dict(Counter(r['state'] for r in rows if r['partition'] == p))
                           for p in sorted({r['partition'] for r in rows})})

hangul = [r for r in rows if r['partition'] == 'korean']
summary['hangul_unicode_name_mismatches'] = sum(
    r['current'].upper() != r['name'].removeprefix('HANGUL SYLLABLE ') for r in hangul)

# This is a partial scheme comparison, NOT a claim that other Hangul syllables
# are RR-correct: final consonants and cross-syllable sound changes need context.
I = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h']
M = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i']
F = ['','g','gg','gs','n','nj','nh','d','l','lg','lm','lb','ls','lt','lp','lh','m','b','bs','s','ss','ng','j','c','k','t','p','h']
scheme_rows = []
for r in hangul:
    cp = int(r['codepoint'][2:], 16)
    o = cp - 0xAC00
    proposed = I[o // 588] + M[(o % 588) // 28] + F[o % 28]
    if proposed != r['current']:
        scheme_rows.append(dict(r, proposed_onset_vowel_only=proposed,
                                classification='conditional RR onset/vowel difference; final unchanged'))
(ROOT / 'korean/scheme-differences.json').write_text(json.dumps(scheme_rows, ensure_ascii=False, indent=2))
summary['hangul_conditional_rr_onset_vowel_differences'] = len(scheme_rows)
fullwidth = []
for r in rows:
    if r['partition'] != 'fullwidth' or not r['current']:
        continue
    norm = ud.normalize('NFKC', r['char'])
    target = ''.join(lookup(ord(c)) or '' for c in norm)
    if norm != r['char'] and target != r['current']:
        fullwidth.append(dict(r, normalized=norm, normalized_mapping=target,
                              classification='normalization inconsistency; requires scheme/context judgment'))
(ROOT / 'korean/fullwidth-candidates.json').write_text(json.dumps(fullwidth, ensure_ascii=False, indent=2))
(ROOT / 'coverage-summary.json').write_text(json.dumps(summary, indent=2))
print(json.dumps(summary, indent=2))
