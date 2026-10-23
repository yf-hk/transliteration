"""Normalize saved vendor catalogs while retaining every original code and row."""
from collections import defaultdict
from pathlib import Path
import csv
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
SOURCES = ROOT / 'sources'

def read(name):
    return json.loads((SOURCES / name).read_text())

def dump(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def casing(code):
    bits = code.replace('_', '-').split('-')
    return '-'.join([bits[0].lower()] + [b.title() if len(b) == 4 else b.upper() if len(b) == 2 else b for b in bits[1:]])

def canonical(vendor, code, name):
    code = casing(code)
    aliases = {'iw': 'he', 'jw': 'jv', 'tl': 'fil', 'lug': 'lg', 'nya': 'ny', 'run': 'rn', 'prs': 'fa-AF'}
    code = aliases.get(code, code)
    # These vendors assign the same literal code to different Kurdish varieties.
    if code == 'ku':
        return 'ckb' if vendor.startswith('azure') else 'kmr'
    if code == 'mni':
        return 'mni-Mtei'  # Azure's live transliteration metadata explicitly identifies Mtei.
    if code == 'iu':
        return 'iu-Cans'
    if vendor == 'google_consumer' and code == 'crh':
        return 'crh-Cyrl'
    if vendor == 'google_consumer' and code == 'ber':
        return 'ber-Tfng'
    if vendor == 'google_consumer' and code == 'sat':
        return 'sat-Olck'
    if code == 'pt' and ('Brazil' in name or vendor == 'google_consumer'):
        return 'pt-BR'
    if code == 'mww' and vendor.startswith('azure'):
        return 'mww-Latn'
    return code

def codes(cell):
    values = [x for x in cell.get('codes', []) if x]
    if values:
        return list(dict.fromkeys(values))
    return [x.strip() for x in cell['text'].split(',') if x.strip()]

def main():
    google = read('google-cloud-languages-extracted.json')['tables']
    consumer = read('google-translate-consumer-extracted.json')['consumer_languages']
    azure = read('azure-languages-api.json')
    azure_docs = read('azure-language-support-extracted.json')['tables']
    catalog = []

    def add(vendor, name, original_codes, **extra):
        item = dict(vendor=vendor, name=name, codes=original_codes,
                    entry_id=canonical(vendor, original_codes[0], name), **extra)
        catalog.append(item)

    for code, name in consumer.items():
        if code != 'auto':
            add('google_consumer', name, [code])
    for row in google[1]['rows'][1:]:
        add('google_cloud_nmt', row[0]['text'], codes(row[1]))
    for row in google[0]['rows'][1:]:
        add('google_cloud_tllm', row[0]['text'], codes(row[1]),
            status='experimental' if 'Experimental' in row[3]['text'] else 'official')
    for row in google[2]['rows'][1:]:
        add('google_cloud_romanization_table', row[0]['text'], codes(row[1]),
            romanization=row[2]['text'] == 'yes', romanized_input_translation=row[3]['text'] == 'yes',
            status='preview')
    for code, value in azure['translation'].items():
        add('azure_translation_api', value['name'], [code], native_name=value['nativeName'])
    for code, value in azure['transliteration'].items():
        pairs = [{'from_script': script['code'], 'to_script': target['code']}
                 for script in value['scripts'] for target in script['toScripts']]
        add('azure_transliteration_api', value['name'], [code], pairs=pairs)
    for row in azure_docs[0]['rows'][1:]:
        add('azure_translation_docs', row[0]['text'], codes(row[1]),
            capabilities={azure_docs[0]['rows'][0][i]['text']: row[i]['text']
                          for i in range(2, len(row))})

    grouped = defaultdict(list)
    for item in catalog:
        grouped[item['entry_id']].append(item)
    likely = read('cldr-likelySubtags.json')['supplemental']['likelySubtags']
    aliases = {x.get('type'): x.get('replacement').split()[0].replace('_', '-')
               for x in ET.parse(SOURCES / 'cldr-supplementalMetadata.xml').findall('.//languageAlias')}
    lang_data = defaultdict(set)
    for item in ET.parse(SOURCES / 'cldr-supplementalData.xml').findall('.//languageData/language'):
        lang_data[item.get('type')].update(item.get('scripts', '').split())

    def script_for(key):
        explicit = next((part for part in key.split('-')[1:] if len(part) == 4 and part.isalpha()), None)
        if explicit:
            return explicit, 'explicit normalized script subtag'
        base = key.split('-')[0]
        lookup = likely.get(key) or likely.get(base)
        if lookup:
            return lookup.split('-')[1], 'CLDR likelySubtags; default-script inference, not a vendor input guarantee'
        replacement = aliases.get(base)
        if replacement:
            return script_for(replacement)[0], 'CLDR alias plus likelySubtags inference'
        return 'UNRESOLVED', 'requires primary-source script confirmation'

    entries = []
    for key, items in grouped.items():
        script, basis = script_for(key)
        # Standard aggregate script names are useful for model routing.
        names = list(dict.fromkeys(item['name'] for item in items))
        preferred = next((item['name'] for item in items if item['vendor'] == 'google_consumer'), names[0])
        entry = dict(entry_id=key, name=preferred, provider_names=names, primary_script=script,
                     script_basis=basis, other_cldr_scripts=sorted(lang_data[key.split('-')[0]] - {script}),
                     providers=items)
        entries.append(entry)
    entries.sort(key=lambda x: (x['name'].casefold(), x['entry_id']))
    dump('vendor-catalogs.json', catalog)
    dump('catalog-normalized.json', entries)
    (ROOT / 'vendor-lists').mkdir(exist_ok=True)
    for vendor in sorted({x['vendor'] for x in catalog}):
        with (ROOT / 'vendor-lists' / (vendor + '.csv')).open('w', newline='') as output:
            writer = csv.DictWriter(output, fieldnames=['name', 'original_codes', 'normalized_entry_id', 'status', 'capability_details'])
            writer.writeheader()
            for item in catalog:
                if item['vendor'] == vendor:
                    writer.writerow({'name': item['name'], 'original_codes': ';'.join(item['codes']),
                                     'normalized_entry_id': item['entry_id'], 'status': item.get('status', ''),
                                     'capability_details': json.dumps({k:v for k,v in item.items() if k not in ['vendor','name','codes','entry_id','status']}, ensure_ascii=False)})
    with (ROOT / 'vendor-lists' / 'azure-directed-transliteration-pairs.csv').open('w', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=['language', 'original_language_code', 'from_script', 'to_script'])
        writer.writeheader()
        for item in catalog:
            if item['vendor'] == 'azure_transliteration_api':
                for pair in item['pairs']:
                    writer.writerow({'language': item['name'], 'original_language_code': item['codes'][0], **pair})
    with (ROOT / 'vendor-supported-languages.csv').open('w', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=['vendor', 'name', 'codes', 'entry_id', 'status', 'details'])
        writer.writeheader()
        for item in catalog:
            writer.writerow({**{k: item.get(k, '') for k in ['vendor', 'name', 'entry_id', 'status']},
                             'codes': ';'.join(item['codes']),
                             'details': json.dumps({k:v for k,v in item.items() if k not in ['vendor','name','codes','entry_id','status']}, ensure_ascii=False)})
    summary = {
        'as_of': '2026-10-21',
        'vendor_rows': {vendor: sum(x['vendor'] == vendor for x in catalog) for vendor in sorted({x['vendor'] for x in catalog})},
        'normalized_entries': len(entries),
        'default_script_counts': {script: sum(x['primary_script'] == script for x in entries) for script in sorted({x['primary_script'] for x in entries})},
        'google_romanization_languages': sum(x.get('romanization', False) for x in catalog),
        'google_romanized_input_translation_languages': sum(x.get('romanized_input_translation', False) for x in catalog),
        'azure_directed_transliteration_pairs': sum(len(x.get('pairs', [])) for x in catalog),
    }
    dump('catalog-summary.json', summary)
    print(json.dumps(summary, indent=2))
    print('Unresolved:', [(x['entry_id'], x['name']) for x in entries if x['primary_script'] == 'UNRESOLVED'])
    api_codes = {x['codes'][0].lower() for x in catalog if x['vendor'] == 'azure_translation_api'}
    doc_codes = {code.lower() for x in catalog if x['vendor'] == 'azure_translation_docs' for code in x['codes']}
    print('Azure API-only literal codes:', sorted(api_codes-doc_codes))
    print('Azure docs-only literal codes:', sorted(doc_codes-api_codes))

if __name__ == '__main__':
    main()
