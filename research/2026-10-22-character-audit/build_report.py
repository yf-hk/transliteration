"""Reconcile frozen primary-source findings with the requested model reviews."""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def load(name):
    return json.loads((ROOT / name).read_text())

def extract_rows(text):
    decoder = json.JSONDecoder()
    for index, char in enumerate(text):
        if char != '[':
            continue
        try:
            rows, _ = decoder.raw_decode(text[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(rows, list) and rows and isinstance(rows[0], dict) and (
            'codepoint' in rows[0] or 'cp' in rows[0]
        ):
            return rows
    raise ValueError('No complete per-codepoint JSON array found')

def cp(row):
    return row.get('codepoint', row.get('cp'))

def write_csv(name, rows):
    fields = list(dict.fromkeys(k for row in rows for k in row))
    with (ROOT / name).open('w', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        writer.writerows({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v
                         for k, v in row.items()} for row in rows)

models = {}
receipts = []
for stem in ['core', 'supplement', 'common', 'han-1', 'han-2', 'han-3']:
    receipt = load(f'sonnet/{stem}.receipt.json')
    assert receipt['exit_code'] == 0 and not receipt['is_error'], (stem, receipt)
    assert receipt['effort_requested'] == 'medium'
    assert 'claude-sonnet-5-5' in receipt['model_usage'], receipt
    rows = extract_rows((ROOT / f'sonnet/{stem}.review.md').read_text())
    packet = extract_rows((ROOT / f'sonnet/{stem}.txt').read_text())
    expected, actual = [cp(x) for x in packet], [cp(x) for x in rows]
    assert len(set(actual)) == len(actual), (stem, 'duplicate model rows')
    assert set(expected) == set(actual), (stem, 'missing or invented model rows', set(expected) ^ set(actual))
    models[stem] = {cp(row): row for row in rows}
    (ROOT / f'sonnet/{stem}.parsed.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    receipts.append(dict(packet=stem, rows=len(rows), model='claude-sonnet-5-5', effort='medium',
                         verdicts=dict(Counter(row['verdict'] for row in rows)),
                         elapsed_seconds=receipt['elapsed_seconds']))
(ROOT / 'sonnet/reconciliation.json').write_text(json.dumps(receipts, indent=2))

data = load('source-data.json')
def source_value(codepoint):
    number = int(codepoint[2:], 16)
    return data[str(number >> 8)][number & 255]

confirmed = []
for source in load('alphabetic/findings.json') + load('symbols/findings.json') + load('cjk/confirmed-nonhan.json'):
    codepoint = cp(source)
    review = models['core'].get(codepoint) or models['supplement'][codepoint]
    if review['verdict'] != 'confirm_error':
        continue
    number = int(codepoint[2:], 16)
    current = source_value(codepoint)
    sources = source.get('sources', [])
    if codepoint == 'U+095C':
        sources = sources + ['https://www.loc.gov/catdir/cpso/romanization/hindi.pdf']
    confirmed.append(dict(codepoint=codepoint, character=chr(number), current=current,
                          suggested=review['suggested'],
                          kind='missing_letter' if current == '' else 'wrong_value',
                          reason=source.get('reason', source.get('evidence')),
                          sources=sources, sonnet_verdict=review['verdict'],
                          sonnet_reason=review['reason'], data_page=number >> 8, data_index=number & 255))
confirmed.sort(key=lambda row: int(row['codepoint'][2:], 16))
assert len({row['codepoint'] for row in confirmed}) == len(confirmed)
write_csv('confirmed-errors.csv', confirmed)
(ROOT / 'confirmed-errors.json').write_text(json.dumps(confirmed, ensure_ascii=False, indent=2))

defaults = []
for row in load('cjk/mandarin-default-shortlist.json'):
    review = models['supplement'][cp(row)]
    defaults.append(dict(row, sonnet_verdict=review['verdict'], sonnet_reason=review['reason'],
                         classification='modern Mandarin default recommendation; not universal reading error'))
write_csv('mandarin-defaults.csv', defaults)

frequency = []
for row in load('cjk/common-reading-candidates.json'):
    review = models['common'][cp(row)]
    frequency.append(dict(codepoint=cp(row), character=row['char'], current=row['current'].strip(),
                          corpus_preference=row['highest_corpus_reading'].capitalize(),
                          corpus_counts=row['corpus_reading_counts'],
                          documented_mandarin_readings=row['accepted_readings'],
                          sonnet_verdict=review['verdict'], sonnet_suggestion=review['suggested'],
                          sonnet_reason=review['reason'],
                          classification='corpus-limited preference; model contextual judgment is not frequency proof'))
write_csv('common-reading-review.csv', frequency)

han = []
all_han_reviews = {key: value for stem in ['han-1','han-2','han-3'] for key,value in models[stem].items()}
for row in load('cjk/han-assessed-final.json'):
    review = all_han_reviews.get(cp(row), {})
    han.append(dict(codepoint=cp(row), character=row['char'], current=row['current'].strip(),
                    documented_unihan_readings=row['accepted_readings'],
                    moe_readings=row.get('moe_readings', []),
                    final_assessment=row['final_assessment'],
                    sonnet_verdict=review.get('verdict', 'not submitted: documented other-language alternative'),
                    sonnet_suggestion=review.get('suggested'), sonnet_reason=review.get('reason'),
                    source_evidence_file='cjk/han-assessed-final.json'))
write_csv('han-candidates.csv', han)

counts = load('coverage-summary.json')
runtime = load('runtime-data-parity.json')
assert runtime['count'] == counts['slots'] and not runtime['mismatch']
assert hashlib.sha256((ROOT / 'source-data.json').read_bytes()).hexdigest() == counts['sha256']
live_bytes = (ROOT.parents[1] / 'data/data.json').read_bytes()
live_data = json.loads(live_bytes)
live_rows = []
for row in confirmed:
    number = int(row['codepoint'][2:], 16)
    page = live_data.get(str(number >> 8), [])
    current = page[number & 255] if len(page) > (number & 255) else None
    live_rows.append(dict(codepoint=row['codepoint'], audited_value=row['current'],
                          live_value=current, suggested=row['suggested'],
                          status='matches_suggestion_now' if current == row['suggested'] else
                                 'unchanged_defect' if current == row['current'] else 'changed_requires_review'))
live_recheck = dict(audited_sha256=counts['sha256'], live_sha256=hashlib.sha256(live_bytes).hexdigest(),
                    changed_during_audit=hashlib.sha256(live_bytes).hexdigest() != counts['sha256'],
                    counts=dict(Counter(row['status'] for row in live_rows)), rows=live_rows)
live_recheck['mandarin_defaults'] = []
for row in defaults:
    number = int(cp(row)[2:], 16)
    page = live_data.get(str(number >> 8), [])
    value = page[number & 255] if len(page) > (number & 255) else None
    live_recheck['mandarin_defaults'].append(dict(codepoint=cp(row), audited_value=row['current'],
        live_value=value, changed=value != row['current']))
(ROOT / 'live-recheck.json').write_text(json.dumps(live_recheck, ensure_ascii=False, indent=2))
states = Counter(row['kind'] for row in confirmed)
freq_counts = Counter(row['sonnet_verdict'] for row in frequency)

report = [
    '# Character romanization audit', '',
    '**Snapshot: 2026-10-22. This audit did not edit production mappings.**', '',
    f"Screened all **{counts['slots']:,} stored slots** in `data/data.json`: **40,258 nonempty mappings**, 1,745 empty strings and 3,053 nulls across 176 pages. Three parallel subagents (the maximum available) audited separate ranges; the parent checked Hangul/fullwidth forms, runtime parity, and reconciliation. Source commit: `e69bb1bba461c8e5cab0937f97e0ff602a931885`.", '',
    f"The reconciled report contains **{len(confirmed)} well-supported data defects** ({states['wrong_value']} wrong nonempty values and {states['missing_letter']} ordinary letters deleted), **33 qualified modern Mandarin default recommendations**, and **105 corpus-frequency candidates**. Sonnet favors changing {freq_counts['prefer_default']} of those 105 defaults and retains or questions {freq_counts['valid_alternative'] + freq_counts['unresolved']}. These groups overlap and must not be summed into a unique error count.", '',
    f"**Concurrent workspace edits:** the live source changed during review. These findings refer to [the exact frozen audited snapshot](source-data.json). The final [live recheck](live-recheck.json) finds {live_recheck['counts'].get('matches_suggestion_now',0)} correction(s) already present, {live_recheck['counts'].get('unchanged_defect',0)} unchanged defects, and {live_recheck['counts'].get('changed_requires_review',0)} other changed confirmed-defect values; it also checks all 33 Mandarin recommendations. Concurrent production edits were preserved and are not attributed to this audit.", '',
    'Every stored value was screened, but this is not native-speaker certification of every language and rare historical reading. Unresolved characters are explicitly listed. Reference agreement establishes a documented reading, not that it is correct in every word.', '',
    '## Confirmed mapping defects', '',
    'All entries below have primary identity/romanization evidence and were independently accepted by **Claude Sonnet 5.5 at medium effort**. Case corrections assume the case-preserving behavior used by neighboring entries. Empty output is shown as `""`. Suggestions are ASCII outputs under the documented language or table convention; alternate schemes can choose different spellings.', '',
    '| Unicode | Character | Current | Suggested | Finding |',
    '|---|---|---|---|---|',
]
for row in confirmed:
    current = json.dumps(row['current'], ensure_ascii=False)
    reason = row['reason'].replace('|','/').replace('\n',' ')
    report.append(f"| {row['codepoint']} | {row['character']} | `{current}` | `{row['suggested']}` | {reason} |")
report += [
    '', '[Machine-readable corrections, sources and reviewer reasoning](confirmed-errors.csv). [JSON version](confirmed-errors.json).', '',
    'U+095C ड़ was additionally verified against the [2025 Library of Congress Hindi chart](https://www.loc.gov/catdir/cpso/romanization/hindi.pdf), which gives the flap ṛa; `dddh` is not that romanization. Choosing `r` versus a distinguishable `rr`/`R` is a table policy decision.', '',
    '## Modern Mandarin defaults', '',
    'These 33 recommendations agree with the frozen Unihan and official Taiwan Ministry of Education dictionary evidence. Sonnet reviewed all 33 separately after that crosscheck. They are recommendations for **ordinary modern Mandarin**, not proof that no older, dialectal or other-language reading ever existed. Tones and trailing table spaces are omitted below.', '',
    '| Unicode | Character | Current | Recommended | Sonnet assessment |',
    '|---|---|---|---|---|',
]
for row in defaults:
    proposed = row.get('suggested', row.get('suggested_mandarin_default'))
    label = 'accepts modern correction' if row['sonnet_verdict'] == 'confirm_error' else 'prefers modern default; historical caution'
    report.append(f"| {cp(row)} | {row.get('char')} | `{row['current'].strip()}` | `{proposed}` | {label} |")
report += [
    '', '[All 33 recommendations with dictionary evidence and Sonnet reasoning](mandarin-defaults.csv). Source records and variant lookup IDs are retained in [the underlying JSON](cjk/mandarin-default-shortlist.json).', '',
    '## Most common reading when several are valid', '',
    'We used Unihan `kHanyuPinlu` reading counts where available, and kept valid alternatives separate from wrong-letter defects. These counts come from an older, limited corpus, not contemporary worldwide usage. A dictionary headword, an isolated-character fallback and the most frequent reading in running text can differ.', '',
    '| Character | Current | Corpus-supported default | Evidence |',
    '|---|---|---|---|',
    '| 了 | Liao | Le | le 30,101; liao 673 |',
    '| 还 / 還 | Huan | Hai | hai 5,894; huan 103 |',
    '| 都 | Du | Dou | dou 5,680; du 93 |',
    '| 着 | Zhao | Zhe | zhe 10,643; zhao 560; zhuo 125 |',
    '| 重 | Chong | Zhong | zhong 1,823; chong 329 |', '',
    f"[Every one of the 105 frequency candidates](common-reading-review.csv) includes counts and Sonnet's individual decision: {freq_counts['prefer_default']} prefer-default, {freq_counts['valid_alternative']} retain valid alternative, {freq_counts['unresolved']} unresolved. For example, 佛 `Fo` should not be changed automatically to `Fu` just because 仿佛 dominates this corpus; 儿/兒 `r` reflects a suffix and does not replace isolated `Er`. The reviewer's contextual explanations are model judgment, not independently measured frequency evidence.", '',
    'A further [734 dictionary-default differences](cjk/customary-default-candidates.json) have individually documented alternatives. These are not 734 errors: `kMandarin` is a customary dictionary/collation default, not a popularity measurement.', '',
    '## Chinese candidates and rejected false positives', '',
    'The complete [per-character Han candidate ledger](han-candidates.csv) and [full primary records](cjk/han-assessed-final.json) retain all **1,497** initial mismatches:', '',
    '| Final primary-evidence category | Characters |',
    '|---|---:|',
    '| Documented other-language reading | 361 |',
    '| Valid MOE regional/historical reading | 160 |',
    '| Variant or language-choice caution | 3 |',
    '| Disagrees with both primary references; candidate, not automatically proven wrong | 207 |',
    '| Only Unihan evidence; unresolved | 766 |', '',
    'Sonnet reviewed all 1,136 candidates that lacked direct other-language matches, but its raw labels do **not** override the later MOE/variant checks. The 33 defaults above are a conservative subset of the reference-mismatch pool. The remaining candidates need additional dialect/historical/variant evidence before changing production data. Valid existing examples include 械 `Jie`, 携/攜 `Xi`, 蠕 `Ruan`, 酵 `Xiao`, 粳 `Geng`, and 癣/癬 `Xian`; a Unihan-only mismatch would wrongly convict them. 囲 `Wei` also has a Japanese shinjitai relationship to 圍.', '',
    '## Contextual failures and scheme differences', '',
    '| Unicode | Current | Required assessment |',
    '|---|---|---|',
    '| U+0651 ّ | W | Shadda doubles the preceding consonant; a fixed W does not implement that. |',
    '| U+0A71 ੱ | H | Addak doubles the following consonant; a fixed H does not implement that. |',
    '| U+0E45 ๅ | ao | Thai vowel-length operation; depends on the preceding sign. No verified universal single-string correction. |',
    '| U+A015 ꀕ | wu | Yi iteration mark; repeat the preceding syllable. The Unicode name WU is a documented misnomer. |',
    '| U+FF70 ｰ | + | Japanese vowel length needs preceding kana context. |',
    '| U+FF9E ﾞ / U+FF9F ﾟ | : / ; | Compose with the preceding kana to obtain voiced/semi-voiced syllables. |', '',
    'Sonnet confirmed the contextual nature of the first four. The halfwidth-kana cases follow the character identities/composition check; they were not submitted as standalone fixed replacements. These require sequence handling rather than an invented Latin fallback. Base Arabic/Hebrew vowels and Indic inherent vowels also need word or language context.', '',
    'All **11,172 Hangul syllables** exactly match lowercase Unicode syllable names. Those spellings form a consistent scheme, but differ from official Korean Revised Romanization. Changing onset/vowel choices alone affects **3,192 syllables** (`gg/kk`, `dd/tt`, `bb/pp`, `c/ch`, `weo/wo`, `yi/ui`). Sonnet explicitly rejected calling that whole range erroneous. Final consonants and sound changes need further context. See [Hangul/fullwidth report](korean/REPORT.md) and [every affected syllable](korean/scheme-differences.json).', '',
    'Other choices held for policy/specialist review: Greek Ύ `U/Y`; Latin Ʊ `Y/U`; Gujarati ય inherent `a`; medieval Latin vend U+A768/U+A769 `Y/y`; archaic M U+A7FF `M1/M`; and pointed Hebrew presentation forms whose common readings can differ from base-letter folding. The [core Sonnet review](sonnet/core.parsed.json) preserves the individual judgments.', '',
    '## Missing support', '',
    'The audit also identified [916 empty/null compatibility-form mappings](symbols/missing-compatibility.json), mostly Arabic presentation forms and enclosed characters, and five missing Yi radicals (U+A4A2, U+A4A3, U+A4B4, U+A4C1, U+A4C5). All have per-character records. Compatibility decompositions suggest useful fallback outputs, but those are **mechanical proposals, not validated gold readings**: at least 20 propagate already-suspect base mappings, and Arabic vowel recovery remains unresolved. See the [independent challenge](symbols/independent-alphabetic-challenge.md).', '',
    'Null/absent support is distinct from a wrong existing nonempty value. Combining marks, controls, fillers and silent signs can legitimately map to empty; this report does not count every empty string as a defect. Entire absent Unicode blocks and supplementary planes are outside the existing-data correctness claim. [Alphabetic missing-assigned inventory](alphabetic/missing-assigned.json) and shard reports document additional coverage gaps.', '',
    '## Verification and reproducibility', '',
    '- [Coverage ledger](coverage.csv): one row for every stored slot, with page-derived code point, value state and audit partition. [Coverage totals](coverage-summary.json).',
    '- [Runtime check](runtime-data-parity.json): all 45,056 stored slots reproduced the expected current output from the existing built package, with Chinese trailing-space trimming and runtime Hangul generation accounted for. **Zero mismatches.** This proves that suspect data reaches output; it does not certify its linguistic correctness.',
    '- Audited `data/data.json` SHA-256: `'+counts['sha256']+'`. Exact source recovered from the matching Git commit and saved as `source-data.json`; snapshot hash verified after reconciliation. This audit did not edit production code/data. Concurrent workspace changes and existing unrelated research were preserved; see `live-recheck.json` for the distinct live hash.',
    '- [Claude reconciliation receipts](sonnet/reconciliation.json): exact `claude-sonnet-5-5`, requested `--effort medium`, successful model identity receipts and complete input/output row reconciliation for all six packets. Raw prompts, replies and receipts are retained in `sonnet/`. Models had no tools: source evidence came from the auditors, and model agreement was never treated as primary proof.',
    '- Frozen [Unicode 17.0 Unihan](https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip), [UnicodeData](https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt), [UAX #38 property definitions](https://www.unicode.org/reports/tr38/tr38-39.html), [official MOE export page](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_reviseddict_download.html), Library of Congress script charts, and [official Korean romanization](https://www.korean.go.kr/front_eng/roman/roman_01.do). Download provenance and hashes are in [cjk/provenance.json](cjk/provenance.json); exact chart links appear on correction rows and shard reports.',
    '- Reproduce inventories with `inventory.py`, `alphabetic/audit.py`, `symbols/audit.py`, and the CJK scripts described in [cjk/REPORT.md](cjk/REPORT.md). `build_report.py` regenerates the reconciled report from frozen findings and model responses; `consult_sonnet.py` documents the exact review invocation.', '',
    'Detailed shards: [Alphabetic/scripts](alphabetic/report.md), [CJK](cjk/REPORT.md), [Symbols/historic](symbols/REPORT.md), [Hangul/fullwidth](korean/REPORT.md).',
]
(ROOT / 'REPORT.md').write_text('\n'.join(report) + '\n')
print(json.dumps(dict(confirmed=len(confirmed), confirmed_kinds=dict(states),
                     mandarin_defaults=len(defaults), frequency=len(frequency),
                     frequency_verdicts=dict(freq_counts), han_candidates=len(han),
                     reviewed_packet_rows=sum(x['rows'] for x in receipts)), indent=2))
