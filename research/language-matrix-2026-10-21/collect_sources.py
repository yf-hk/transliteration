"""Collect public vendor language data without credentials or paid API calls."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import re
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent
SOURCES = ROOT / 'sources'
URLS = {
    'google-cloud-languages.html': 'https://docs.cloud.google.com/translate/docs/languages',
    'azure-language-support.html': 'https://learn.microsoft.com/en-us/azure/ai-services/translator/language-support',
    'azure-languages-api.json': 'https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation,transliteration,dictionary',
    'google-translate-consumer.html': 'https://translate.google.com/?hl=en&sl=auto&tl=en&op=translate',
    'cldr-likelySubtags.json': 'https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-core/supplemental/likelySubtags.json',
    'cldr-supplementalData.xml': 'https://raw.githubusercontent.com/unicode-org/cldr/main/common/supplemental/supplementalData.xml',
    'cldr-supplementalMetadata.xml': 'https://raw.githubusercontent.com/unicode-org/cldr/main/common/supplemental/supplementalMetadata.xml',
}

class Tables(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables = []
        self.heading = ''
        self.heading_parts = None
        self.table = None
        self.row = None
        self.cell = None
        self.consumer_languages = {}
        self.consumer_code = None
        self.consumer_parts = []
        self.consumer_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('h1', 'h2', 'h3'):
            self.heading_parts = []
        if tag == 'table':
            self.table = {'heading': self.heading, 'rows': []}
        if self.table is not None and tag == 'tr':
            self.row = []
        if self.row is not None and tag in ('th', 'td'):
            self.cell = {'text': [], 'icons': [], 'codes': [], 'attrs': attrs}
        if self.cell is not None:
            if tag == 'code':
                self.cell['code_open'] = True
            if tag == 'br':
                self.cell['text'].append(' ')
            if tag in ('img', 'svg'):
                self.cell['icons'].append(attrs)
                self.cell['text'].append(attrs.get('alt', '') or attrs.get('aria-label', ''))
            if 'compare-yes' in attrs.get('class', '').split():
                self.cell['text'].append('yes')
            if 'compare-no' in attrs.get('class', '').split():
                self.cell['text'].append('no')
        if attrs.get('data-language-code'):
            self.consumer_code = attrs['data-language-code']
            self.consumer_parts = []
            self.consumer_depth = 1
        elif self.consumer_depth and tag not in ('br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'wbr'):
            self.consumer_depth += 1

    def handle_data(self, data):
        if self.heading_parts is not None:
            self.heading_parts.append(data)
        if self.cell is not None:
            self.cell['text'].append(data)
            if self.cell.get('code_open'):
                self.cell['codes'].append(data.strip())
        if self.consumer_depth and data.strip() not in ('check', 'history', 'auto_awesome'):
            self.consumer_parts.append(data)

    def handle_endtag(self, tag):
        if tag == 'code' and self.cell is not None:
            self.cell['code_open'] = False
        if tag in ('h1', 'h2', 'h3') and self.heading_parts is not None:
            self.heading = ' '.join(''.join(self.heading_parts).split())
            self.heading_parts = None
        if tag in ('td', 'th') and self.cell is not None:
            self.cell['text'] = ' '.join(''.join(self.cell['text']).split())
            self.row.append(self.cell)
            self.cell = None
        if tag == 'tr' and self.row is not None:
            self.table['rows'].append(self.row)
            self.row = None
        if tag == 'table' and self.table is not None:
            self.tables.append(self.table)
            self.table = None
        if self.consumer_depth:
            self.consumer_depth -= 1
            if not self.consumer_depth:
                value = ' '.join(''.join(self.consumer_parts).split())
                if value:
                    self.consumer_languages[self.consumer_code] = value

def fetch(item):
    name, url = item
    request = urllib.request.Request(url, headers={'User-Agent': 'Transliteration-language-research/1.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read()
        final_url = response.url
    (SOURCES / name).write_bytes(data)
    return {'file': name, 'requested_url': url, 'resolved_url': final_url,
            'retrieved_at_utc': datetime.now(timezone.utc).isoformat(),
            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def main():
    SOURCES.mkdir(parents=True, exist_ok=True)
    manifest_path = SOURCES / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else []
    pending = [(name, url) for name, url in URLS.items() if '--refresh' in sys.argv or not (SOURCES / name).exists()]
    with ThreadPoolExecutor(max_workers=5) as pool:
        fetched = list(pool.map(fetch, pending))
    updated = {entry['file']: entry for entry in manifest}
    updated.update({entry['file']: entry for entry in fetched})
    manifest = list(updated.values())
    (SOURCES / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    for name in ('google-cloud-languages.html', 'azure-language-support.html', 'google-translate-consumer.html'):
        parser = Tables()
        parser.feed((SOURCES / name).read_text())
        output = {'tables': parser.tables, 'consumer_languages': parser.consumer_languages}
        (SOURCES / name.replace('.html', '-extracted.json')).write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
        print(name, 'tables:', [(t['heading'], len(t['rows']) - 1) for t in parser.tables], 'consumer languages:', len(parser.consumer_languages))
    azure = json.loads((SOURCES / 'azure-languages-api.json').read_text())
    print('Azure API:', {k: len(v) for k, v in azure.items()})

if __name__ == '__main__':
    main()
