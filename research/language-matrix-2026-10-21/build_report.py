"""Generate a complete per-entry method assessment from reviewed profiles."""
from collections import Counter
from pathlib import Path
import csv
import json

ROOT = Path(__file__).resolve().parent
SOURCES = ROOT / 'sources'

def load(name):
    return json.loads((ROOT / name).read_text())

def save(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def profile_for(entry):
    script = entry['primary_script']
    key = entry['entry_id']
    base = key.split('-')[0]
    if script == 'Latn': return 'latin'
    if script == 'Cyrl': return 'cyrillic'
    if script == 'Arab':
        if key == 'ms-Arab': return 'jawi'
        if base in ('ug', 'ckb'): return 'arabic-vowels-written'
        return 'arabic-missing-vowels'
    if script in ('Hans', 'Hant'):
        if base == 'yue': return 'cantonese'
        if base == 'lzh' or key in ('zh', 'zh-HK', 'zh-Hans', 'zh-Hant'): return 'han-policy'
        return 'mandarin'
    if script == 'Hebr': return 'yiddish' if base == 'yi' else 'hebrew'
    if script == 'Deva': return 'sanskrit' if base == 'sa' else 'indic-lexical'
    if script in ('Beng', 'Gujr', 'Guru', 'Orya', 'Taml'): return 'indic-lexical'
    if script in ('Knda', 'Mlym', 'Telu', 'Sinh'): return 'indic-structural'
    if script == 'Mymr': return 'shan' if base == 'shn' else 'myanmar'
    if script == 'Tibt': return 'tibetan' if base == 'bo' else 'dzongkha'
    return {
        'Armn': 'armenian', 'Geor': 'georgian', 'Grek': 'greek', 'Cans': 'syllabics',
        'Ethi': 'ethiopic', 'Jpan': 'japanese', 'Kore': 'korean', 'Thai': 'thai',
        'Laoo': 'lao', 'Khmr': 'khmer', 'Tibt': 'tibetan', 'Mong': 'traditional-mongolian',
        'Thaa': 'thaana', 'Mtei': 'meetei', 'Olck': 'ol-chiki', 'Nkoo': 'nko',
        'Tfng': 'tifinagh', 'Piqd': 'piqad',
    }[script]

def md(value):
    return str(value).replace('|', '\\|').replace('\n', ' ')

def original_codes(entry, vendor):
    return ';'.join(dict.fromkeys(code for p in entry['providers'] if p['vendor'] == vendor for code in p['codes']))

def main():
    entries = load('catalog-normalized.json')
    catalog = load('vendor-catalogs.json')
    summary = load('catalog-summary.json')
    profiles = load('method-profiles.json')
    notes = load('language-notes.json')
    assessed = []
    for entry in entries:
        key = entry['entry_id']
        base = key.split('-')[0]
        profile_id = profile_for(entry)
        profile = profiles[profile_id]
        note = notes.get(key) or notes.get(base)
        if not note:
            note = f"{entry['name']} is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy."
        pairs = [pair for p in entry['providers'] if p['vendor'] == 'azure_transliteration_api' for pair in p['pairs']]
        google_table = [p for p in entry['providers'] if p['vendor'] == 'google_cloud_romanization_table']
        google_romanization = ('yes' if any(p['romanization'] for p in google_table) else 'no') if google_table else 'not listed under this code'
        google_romanized_input = ('yes' if any(p['romanized_input_translation'] for p in google_table) else 'no') if google_table else 'not listed under this code'
        tllm = [p for p in entry['providers'] if p['vendor'] == 'google_cloud_tllm']
        assessment = {
            **entry, 'profile_id': profile_id, 'method_class': profile['class'],
            **{key: profile[key] for key in ['orthographic_method','readable_method','nlp','one_to_one','implementation','limits']},
            'language_specific_note': note,
            'google_consumer_codes': original_codes(entry, 'google_consumer'),
            'google_cloud_nmt_codes': original_codes(entry, 'google_cloud_nmt'),
            'google_cloud_tllm_codes': original_codes(entry, 'google_cloud_tllm'),
            'google_cloud_tllm_status': ';'.join(dict.fromkeys(p['status'] for p in tllm)),
            'azure_translation_codes': original_codes(entry, 'azure_translation_api'),
            'google_cloud_romanization': google_romanization,
            'google_cloud_romanized_input_translation': google_romanized_input,
            'azure_transliteration_pairs': pairs,
            'source_urls': list(dict.fromkeys(profile['sources'] + [
                'https://github.com/unicode-org/cldr-json/blob/main/cldr-json/cldr-core/supplemental/likelySubtags.json',
                'https://github.com/unicode-org/cldr/blob/main/common/supplemental/supplementalData.xml',
            ])),
            'evidence_level': 'script/standard-based engineering recommendation; not a native-reviewed accuracy result',
            'native_review_needed': profile_id != 'latin',
            'alternate_script_scope': 'Other CLDR scripts are metadata only; alternative input scripts require separate profiles and are not asserted vendor capabilities',
        }
        assessed.append(assessment)
    save('language-assessments.json', assessed)
    counts = Counter(x['method_class'] for x in assessed)
    summary['method_class_counts'] = dict(sorted(counts.items()))
    summary['method_profile_counts'] = dict(sorted(Counter(x['profile_id'] for x in assessed).items()))
    summary['google_tllm_status_counts'] = dict(Counter(x['status'] for x in catalog if x['vendor'] == 'google_cloud_tllm'))
    save('summary.json', summary)

    fields = ['entry_id','name','primary_script','script_basis','method_class','profile_id',
              'google_consumer_codes','google_cloud_nmt_codes','google_cloud_tllm_codes','google_cloud_tllm_status',
              'azure_translation_codes','google_cloud_romanization','google_cloud_romanized_input_translation',
              'azure_transliteration_pairs','one_to_one','nlp','orthographic_method','readable_method',
              'implementation','language_specific_note','limits','other_cldr_scripts','evidence_level','source_urls']
    with (ROOT / 'language-assessments.csv').open('w', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        for entry in assessed:
            writer.writerow({key: json.dumps(entry[key],ensure_ascii=False) if isinstance(entry[key],list) else entry[key] for key in fields})

    report = [
        '# Supported languages and recommended transliteration methods', '',
        '**Snapshot date: 2026-10-21.** Research and engineering recommendations; no new language engines were implemented or quality-benchmarked.', '',
        '## Result', '',
        f"All **{len(assessed)} normalized language/script/locale entries** have an individual assessment. This count includes regional variants and generic/specific language tags; it is not a count of distinct human languages. Every original vendor row/code remains available in the saved catalogs.", '',
        '| Recommended starting method | Entries | Meaning |', '|---|---:|---|',
        f"| A — preserve Latin spelling | {counts['A']} | No romanization NLP; optional locale-aware ASCII folding |",
        f"| B — mapping tables | {counts['B']} | Character/symbol-to-string mappings, normalization and a selected scheme |",
        f"| C — mapping plus algorithms | {counts['C']} | Syllable parsing, combining signs, digraphs or finite contextual rules |",
        f"| D — lexical/contextual processing | {counts['D']} | For reliable readable output, use word/phrase readings, morphology, segmentation or vowel recovery; a learned model is optional |", '',
        'These are recommended starting methods for the defined output contract, not quality scores or proofs that a neural model is necessary. In particular, a D language may have a fully deterministic **orthographic** transliteration but need lexical knowledge for **pronunciation-based** romanization. A–C classifications do not promise recovery of every name or unmarked pronunciation detail.', '',
        '## Saved inventories', '',
        '| Source/catalog | Saved rows | File |', '|---|---:|---|',
        '| Google Translate consumer language picker | 249, excluding Detect language | [Consumer list](vendor-lists/google_consumer.csv) |',
        '| Google Cloud NMT | 194 | [NMT list](vendor-lists/google_cloud_nmt.csv) |',
        '| Google Cloud Translation LLM | 127, including 14 experimental entries and locale/alias rows | [TLLM list](vendor-lists/google_cloud_tllm.csv) |',
        '| Azure Translator translation, live public API | 138 | [Azure translation list](vendor-lists/azure_translation_api.csv) |',
        '| Azure translation documentation | 135 | [Documentation list](vendor-lists/azure_translation_docs.csv) |',
        '| Azure transliteration, live public API | 42 language entries, 86 directed language/script pairs | [Language list](vendor-lists/azure_transliteration_api.csv), [directed pairs](vendor-lists/azure-directed-transliteration-pairs.csv) |',
        '| Google Cloud romanization / romanized-input translation table | 14 rows: 10 romanization and 9 romanized-input translation flags | [Capabilities](vendor-lists/google_cloud_romanization_table.csv) |', '',
        'The consumer list was read from the public Google Translate HTML language picker (`data-language-code` plus its displayed English label), not an undocumented translation endpoint. It is a consumer UI snapshot, not a promise of Google Cloud API availability. Google Cloud model lists and Azure API metadata were collected separately. Counts above are derived from saved source records; the providers can change them.', '',
        'Primary sources: [Google Translate](https://translate.google.com/?hl=en), [Google Cloud language support](https://docs.cloud.google.com/translate/docs/languages), [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/translator/language-support), [Azure public Languages API](https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation,transliteration,dictionary). The exact URLs, timestamps, byte counts and SHA-256 digests are saved in [the source manifest](sources/manifest.json).', '',
        '### Vendor differences that matter', '',
        '- Azure live translation metadata includes `be`, `es-MX`, and `lb`, which were absent from the 135-row translation documentation table at retrieval. The report uses the 138-entry live API as the Azure translation inventory while preserving both snapshots.',
        '- Google Cloud `romanizeText` means source script to Latin. Its `enableTransliteration` translation option means romanized Latin input feeding a translation request. It is not a general reverse transliteration API. The saved support flags preserve this distinction.',
        '- Google Cloud currently lists romanization for Arabic, Amharic, Bengali, Belarusian, Hindi, Japanese, Myanmar, Russian, Serbian and Ukrainian. Chinese and Korean translation support does not imply support in this Cloud romanization table. Consumer UI pronunciation features are a separate capability.',
        '- Azure lists explicit language/from-script/to-script directions. Its public list does not establish which named national romanization standard, pronunciation method or model it uses. Latin-to-native directions can require ambiguity resolution even where forward spelling conversion is deterministic.',
        '- Google Cloud romanization/transliteration features are marked Preview; Google TLLM experimental entries are explicitly labeled in the saved list.', '',
        '## What is being classified', '',
        'The target is **written input to a declared Latin romanization**, as needed by this module and a future service. Each entry distinguishes (1) spelling-preserving orthographic conversion and (2) readable, pronunciation-based output. Translation, IPA transcription, speech recognition, OCR, reverse input methods, and all historical/alternative scripts are not silently included.', '',
        'A literal one-to-one character map is too narrow: a character can produce several Latin letters, several code points can form one orthographic unit, and combining marks may need normalization. B covers table-driven character-to-string methods; C adds bounded algorithms. D denotes lexical/contextual knowledge, which can be supplied by dictionaries and rules, compact neural models, or a combination. It does **not** mean a general LLM is required.', '',
        'For Latin input, retaining the source spelling is already the romanization result. English or Irish spelling-to-pronunciation conversion would be a different product. ASCII slug normalization is lossy and must not be confused with a reversible or pronunciation-preserving transform.', '',
        '### Script and alias policy', '',
        '- Explicit script variants take precedence. Otherwise [CLDR likelySubtags](sources/cldr-likelySubtags.json) supplies a **default-script inference**, not an API input guarantee. [CLDR languageData](sources/cldr-supplementalData.xml) provides alternate-script metadata. The downloaded likely-subtag file identifies CLDR 48 / Unicode 16 data; these are recorded data versions, not a claim that every source uses one Unicode release.',
        '- Original codes are preserved. Normalized IDs are internal report keys, not replacement API request parameters. Deprecated/overlong aliases such as `iw/he`, `jw/jv`, `tl/fil`, `lug/lg`, `nya/ny`, `run/rn`, and `prs/fa-AF` are documented through CLDR or explicit vendor aliases.',
        '- The literal `ku` is provider-dependent: Google means Kurmanji; Azure means Central Kurdish/Sorani. These become separate `kmr` and `ckb` assessment keys.',
        '- Script-qualified internal keys preserve NKo, Tifinagh, Ol Chiki, Inuktitut syllabics, Crimean Tatar Cyrillic, Meitei Mayek, and Latin Hmong Daw. Azure Meitei script inference comes from its live transliteration metadata; Latin Hmong Daw is explicit in Azure documentation.',
        '- Generic codes and regional/script codes remain separate where merging would invent equivalence, for example `zh`, `zh-CN`, `zh-Hans`, `zh-TW`, `zh-Hant`, `zh-HK`; `no/nb`; and generic/Brazilian/European Portuguese.',
        '- Mixed scripts need per-span script handling. The Latin-first classification for Fulani, Javanese, Balinese, Sundanese, Hausa, Malay, Uzbek and others applies to the catalog default/explicit input script. Their other scripts require additional profiles. Historical CLDR alternatives are recorded but are not a claim of vendor acceptance or completed research for every alternative writing system.', '',
        '## Recommendations for this module and service', '',
        '1. Ship deterministic A–C profiles as small tables and finite-state/structural algorithms, with explicit language/script/standard and versioned output behavior.',
        '2. For D profiles, establish dictionary/rule baselines and use specialist reading models only where held-out evaluation shows a benefit. Keep name/phrase overrides and an honest ambiguity policy.',
        '3. Split orthographic and pronunciation modes. For example, Sanskrit IAST and Tibetan Wylie are bounded spelling contracts; inferred vowels in Arabic/Hebrew and Kanji readings are lexical problems.',
        '4. Keep Hanyu Pinyin, Jyutping, Korean RR and Thai RTGS as separate named profiles. Chinese script variants do not identify a spoken reading language; Korean Hangul support does not automatically cover Hanja.',
        '5. Train/evaluate in Python if convenient, but implement portable tables/rules and exportable compact models for the chosen production runtime. Model export does not port tokenizers, lexicons and morphology automatically.',
        '6. No general LLM is selected as the mandatory default for any entry. Compare one only if it improves the same native-reviewed accuracy/latency/cost evaluation.', '',
        '## Every language and variant', '',
        'The table below contains every normalized entry. The [CSV](language-assessments.csv) includes full orthographic/readable methods, NLP requirements, provider codes, capability flags, source URLs and evidence limits; the [JSON](language-assessments.json) additionally retains original provider rows. Profile links below expand the shared algorithm and source rationale. The language-specific note makes exceptions explicit.', '',
        '| Language / normalized key | Default script | Class / method profile | Provider translation catalogs | Language-specific recommendation |',
        '|---|---|---|---|---|',
    ]
    abbreviations = [('google_consumer_codes','G'),('google_cloud_nmt_codes','N'),('google_cloud_tllm_codes','L'),('azure_translation_codes','A')]
    for entry in assessed:
        supported = ', '.join(short for field,short in abbreviations if entry[field])
        report.append(f"| {md(entry['name'])} (`{entry['entry_id']}`) | {entry['primary_script']} | {entry['method_class']} / [{entry['profile_id']}](#profile-{entry['profile_id']}) | {supported or 'capability-only entry'} | {md(entry['language_specific_note'])} |")
    report += ['', 'Catalog abbreviations: **G** Google consumer; **N** Google Cloud NMT; **L** Google Cloud Translation LLM (official/experimental status in CSV); **A** Azure live translation API. These letters indicate translation catalog membership, not romanization endpoint support.', '', '## Method profiles and primary evidence', '']
    for profile_id, profile in profiles.items():
        members = [x for x in assessed if x['profile_id'] == profile_id]
        report += [f'<a id="profile-{profile_id}"></a>', '', f"### {profile['title']}", '',
                   f"**Class {profile['class']}; {len(members)} catalog entries.**", '',
                   f"**Orthographic method:** {profile['orthographic_method']}.", '',
                   f"**Recommended readable method:** {profile['readable_method']}.", '',
                   f"**NLP requirement:** {profile['nlp']}.", '',
                   f"**Mapping shape:** {profile['one_to_one']}.", '',
                   f"**Implementation:** {profile['implementation']}.", '',
                   f"**Limits:** {profile['limits']}", '',
                   'Primary sources: ' + ', '.join(f'[Source {i+1}]({url})' for i,url in enumerate(profile['sources'])) + '.', '',
                   'Entries: ' + ', '.join(f"{x['name']} (`{x['entry_id']}`)" for x in members) + '.', '']
    report += [
        '## Research depth and remaining uncertainty', '',
        'Every saved vendor entry is assessed, but this is **not** a claim that 305 independent linguistic evaluations were performed. Latin entries are classified from their selected/default script and Unicode behavior. Other entries use authoritative script/romanization standards, language-specific notes, and tool documentation. The shared profiles identify reusable work without equating languages that share a script.', '',
        'For lower-resource languages and dialects, a script standard is firmer evidence than a pronunciation model recommendation. Awadhi, Bodo, Chhattisgarhi, Dogri, Konkani, Maithili, Marwari, Newari, Tulu, Meitei, Shan and similar rows require native-reviewed fixtures and orthography selection before a readable-output quality promise. Candidate tools were researched, not all installed or benchmarked. No training, paid translation calls or language-output comparison against vendor services was performed.', '',
        'The [companion source analysis](../2026-10-21-language-methods-sources.md) records finer standards details, including current Japanese government guidance, Indic scope exclusions, Sorani/Uyghur exceptions, and distinctions between spelling and speech.', '',
        '## Reproduction and provenance', '',
        'The collectors use only Python standard-library modules. `collect_sources.py` reuses saved inputs unless `--refresh` is supplied; refreshing deliberately changes the snapshot. `build_catalog.py` retains vendor rows/aliases and computes script assumptions. `build_report.py` applies the reviewed profile and per-language note files. `audit_inventory.py` checks inventory completeness, source hashes, aliases and report links; its [saved result](inventory-audit.json) is a data integrity audit, not an implementation test of transliteration quality.', '',
        '```sh',
        'python3 research/language-matrix-2026-10-21/collect_sources.py',
        'python3 research/language-matrix-2026-10-21/build_catalog.py',
        'python3 research/language-matrix-2026-10-21/build_report.py',
        'python3 research/language-matrix-2026-10-21/audit_inventory.py',
        '```', '',
    ]
    (ROOT / 'REPORT.md').write_text('\n'.join(report))
    print(json.dumps({'entries':len(assessed),'class_counts':dict(counts),'profiles':len(profiles)},indent=2))

if __name__ == '__main__':
    main()
