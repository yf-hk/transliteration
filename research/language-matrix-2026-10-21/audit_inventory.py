"""Audit saved research data completeness, not transliteration correctness."""
from collections import Counter
from pathlib import Path
import csv
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent

def read(name):
    return json.loads((ROOT / name).read_text())

def main():
    entries = read('language-assessments.json')
    catalog = read('vendor-catalogs.json')
    profiles = read('method-profiles.json')
    checks = {}

    def check(name, condition):
        if not condition:
            raise AssertionError(name)
        checks[name] = True

    ids = {entry['entry_id'] for entry in entries}
    check('all_305_entries_unique_and_assessed', len(entries) == len(ids) == 305)
    check('every_original_vendor_row_is_represented', all(row['entry_id'] in ids for row in catalog))
    check('every_script_has_recorded_basis', all(row['primary_script'] != 'UNRESOLVED' and row['script_basis'] for row in entries))
    check('every_entry_has_methods_notes_sources', all(row['orthographic_method'] and row['readable_method'] and row['language_specific_note'] and row['source_urls'] for row in entries))
    check('every_profile_used', set(profiles) == {row['profile_id'] for row in entries})
    check('profile_and_entry_classes_match', all(row['method_class'] == profiles[row['profile_id']]['class'] for row in entries))
    with (ROOT / 'language-assessments.csv').open() as source:
        csv_rows = list(csv.DictReader(source))
    check('assessment_csv_matches_json', len(csv_rows) == len(entries) and {row['entry_id'] for row in csv_rows} == ids)
    raw = (ROOT / 'sources/google-translate-consumer.html').read_text()
    raw_codes = set(re.findall('data-language-code="([^\"]+)"', raw)) - {'auto'}
    consumer = {code for row in catalog if row['vendor'] == 'google_consumer' for code in row['codes']}
    check('all_249_consumer_picker_codes_saved', raw_codes == consumer and len(consumer) == 249)
    check('consumer_labels_exclude_icon_text', all(not any(icon in row['name'] for icon in ['checkhistory','auto_awesome']) for row in catalog if row['vendor'] == 'google_consumer'))
    for vendor in sorted({row['vendor'] for row in catalog}):
        expected = [(row['name'], ';'.join(row['codes']), row['entry_id']) for row in catalog if row['vendor'] == vendor]
        with (ROOT / 'vendor-lists' / (vendor + '.csv')).open() as source:
            actual = [(row['name'], row['original_codes'], row['normalized_entry_id']) for row in csv.DictReader(source)]
        check(vendor + '_list_preserves_all_original_rows', expected == actual)
    google = read('sources/google-cloud-languages-extracted.json')['tables']
    check('google_html_flags_are_explicit', all(cell['text'] in ['yes','no'] for row in google[2]['rows'][1:] for cell in row[2:4]))
    check('google_romanization_counts_match_source', sum(row[2]['text'] == 'yes' for row in google[2]['rows'][1:]) == 10 and sum(row[3]['text'] == 'yes' for row in google[2]['rows'][1:]) == 9)
    azure = read('sources/azure-languages-api.json')
    check('azure_translation_all_138_codes_saved', len(azure['translation']) == 138 and set(azure['translation']) == {code for row in catalog if row['vendor'] == 'azure_translation_api' for code in row['codes']})
    pairs = {(code, script['code'], target['code']) for code,value in azure['transliteration'].items() for script in value['scripts'] for target in script['toScripts']}
    with (ROOT / 'vendor-lists/azure-directed-transliteration-pairs.csv').open() as source:
        pair_rows = list(csv.DictReader(source))
    check('all_86_azure_directions_saved', len(pairs) == len(pair_rows) == 86 and pairs == {(row['original_language_code'], row['from_script'], row['to_script']) for row in pair_rows})
    by_id = {row['entry_id']:row for row in entries}
    check('provider_kurdish_code_collision_kept_separate', by_id['kmr']['google_consumer_codes'] == 'ku' and by_id['ckb']['azure_translation_codes'] == 'ku' and by_id['kmr']['primary_script'] == 'Latn' and by_id['ckb']['primary_script'] == 'Arab')
    check('vendor_meitei_and_hmong_script_overrides_retained', by_id['mni-Mtei']['primary_script'] == 'Mtei' and by_id['mww-Latn']['primary_script'] == 'Latn')
    check('script_only_han_requires_reading_policy', by_id['zh-Hans']['profile_id'] == by_id['zh-Hant']['profile_id'] == 'han-policy')
    check('yiddish_rule_first_and_dzongkha_separate', by_id['yi']['method_class'] == 'C' and by_id['dz']['profile_id'] != by_id['bo']['profile_id'])
    report = (ROOT / 'REPORT.md').read_text()
    check('all_profile_links_resolve', all('id="profile-' + key + '"' in report for key in profiles))
    check('report_contains_every_entry', all('(`' + key + '`)' in report for key in ids))
    manifest = read('sources/manifest.json')
    check('all_snapshot_hashes_match', all(hashlib.sha256((ROOT / 'sources' / row['file']).read_bytes()).hexdigest() == row['sha256'] for row in manifest))
    result = {
        'as_of': '2026-10-21',
        'scope': 'Research inventory/data-integrity audit; no transliteration implementation or linguistic accuracy benchmark',
        'checks': checks, 'assessed_entries': len(entries), 'original_vendor_rows': len(catalog),
        'method_class_counts': dict(sorted(Counter(row['method_class'] for row in entries).items())),
        'profiles': len(profiles), 'source_snapshots': len(manifest),
    }
    (ROOT / 'inventory-audit.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'checks_passed':len(checks), **{key:result[key] for key in ['assessed_entries','original_vendor_rows','method_class_counts','profiles']}}, indent=2))

if __name__ == '__main__':
    main()
