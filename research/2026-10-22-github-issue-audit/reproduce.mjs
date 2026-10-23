// Focused issue reproductions against the integrity-verified published package.
// --strict fails while the four unambiguous correctness defects remain.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const dir = path.dirname(fileURLToPath(import.meta.url));
const published = path.join(dir, 'published/package');
const requirePublished = createRequire(path.join(published, 'package.json'));
const metadata = requirePublished('./package.json');
const requireLocal = createRequire(path.join(dir, '../../package.json'));
const sourceData = requireLocal('./data/data.json');

const umd = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(published, 'dist/browser/bundle.umd.min.js'), 'utf8'), umd);
const browserEsm = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(published, 'dist/browser/bundle.esm.min.js')).toString('base64'));
const variants = [
  ['published-node-full', requirePublished('transliteration')],
  ['published-browser-umd-full', umd],
  ['published-browser-esm-full', browserEsm],
];
const results = [];

function check(variant, issue, label, callback, expected, category = 'confirmed-bug') {
  let actual;
  let error;
  try { actual = callback(); } catch (caught) { error = caught.message; }
  let matches = false;
  if (!error) {
    try { assert.deepEqual(actual, expected); matches = true; } catch {}
  }
  results.push({ variant, issue, label, category, expected, actual, ...(error ? { error } : {}), matches });
}

for (const [variant, api] of variants) {
  api.transliterate.config({}, true);
  api.slugify.config({}, true);
  api.transliterate.setData({}, true);
  api.slugify.setData({}, true);
  check(variant, '#107', "transliterate('ýÝ')", () => api.transliterate('ýÝ'), 'yY');
  check(variant, '#256', "transliterate('STRAẞE')", () => api.transliterate('STRAẞE'), 'STRASSE');
  check(variant, '#256', "slugify('STRAẞE')", () => api.slugify('STRAẞE'), 'strasse');
  check(variant, '#246', "transliterate('ъ', {unknown:'?'})", () => api.transliterate('ъ', { unknown: '?' }), '');
  api.transliterate.setData({ x: '' });
  check(variant, '#246', "setData({x:''}); transliterate('axb', {unknown:'?'})", () => api.transliterate('axb', { unknown: '?' }), 'ab');
  api.transliterate.setData({}, true);
  check(variant, 'PR #252', "slugify('Hello World', {allowedChars:undefined})", () => api.slugify('Hello World', { allowedChars: undefined }), 'hello-world');
  check(variant, 'PR #252', "slugify('Hello World', {allowedChars:null})", () => api.slugify('Hello World', { allowedChars: null }), 'hello-world');
  api.slugify.config({ allowedChars: undefined });
  check(variant, 'PR #252', 'default config with allowedChars:undefined', () => api.slugify('Hello World'), 'hello-world');
  api.slugify.config({}, true);
  check(variant, '#239 / closed #2', "slugify('hello世界')", () => api.slugify('hello世界'), 'hello-shi-jie', 'spacing-inconsistency');
  check(variant, '#239', "slugify('你好world')", () => api.slugify('你好world'), 'ni-hao-world', 'working-control');
  check(variant, '#239', 'explicit source-space workaround', () => api.slugify('hello 世界'), 'hello-shi-jie', 'working-control');
  api.transliterate.setData({ '𠮷': 'Ji' });
  check(variant, '#101', 'custom supplementary mapping proves runtime supports a surrogate pair', () => api.transliterate('𠮷'), 'Ji', 'working-control');
  api.transliterate.setData({}, true);
  check(variant, '#233', 'empty separator', () => api.slugify('hello world', { separator: '' }), 'helloworld', 'working-control');
  check(variant, '#229', 'historically fixed Chinese surname mapping', () => api.transliterate('叶海林'), 'Ye Hai Lin', 'working-control');
  check(variant, '#26', 'ignored O-slash preserves preceding space', () => api.transliterate('Twenty Øne Piløts', { ignore: ['Ø'] }), 'Twenty Øne Pilots', 'working-control');
  check(variant, '#228', 'micro sign and Greek mu are different code points', () => [api.transliterate('µg'), api.transliterate('μg')], ['ug', 'mg'], 'working-control');
}

const api = requirePublished('transliteration');
const observations = {
  tamil: { input: 'கன்னியாகுமரி', actual: api.transliterate('கன்னியாகுமரி') },
  arabic: { input: 'ب ا ب', actual: api.transliterate('ب ا ب') },
  thai: { input: 'เชียงใหม่', actual: api.transliterate('เชียงใหม่') },
  supplementaryCjk: { input: '𠮷𠬠𡬶𫗭𣛙𢎐', actual: api.transliterate('𠮷𠬠𡬶𫗭𣛙𢎐') },
  numberBoundaries: { input: '2022年中文01英文nihao02', actual: api.slugify('2022年中文01英文nihao02') },
};

const sizes = {};
const artifactMatches = {};
for (const name of ['dist/node/src/node/index.js','dist/node/src/node/latin.js','dist/browser/bundle.umd.min.js','dist/browser/latin.umd.min.js','dist/browser/bundle.esm.min.js','dist/browser/latin.esm.min.js']) {
  const bytes = fs.readFileSync(path.join(published, name));
  sizes[name] = bytes.length;
  artifactMatches[name] = bytes.equals(fs.readFileSync(path.join(dir, '../..', name)));
}
const silentSource = {};
for (const character of ['ъ','ь','ا','①']) {
  const code = character.codePointAt(0);
  silentSource[character] = { sourceValue: sourceData[code >> 8]?.[code & 255], runtimeMapHasKey: Object.hasOwn(api.transliterate.setData(), character) };
}
check('published-node-latin', '#253', 'Latin Node artifact remains below 20 KB', () => sizes['dist/node/src/node/latin.js'] < 20_000, true, 'working-control');
check('published-node-latin', '#249', 'CommonJS self-reference resolves latin export', () => requirePublished('transliteration/latin').transliterate('São'), 'Sao', 'working-control');
const esmImport = spawnSync(process.execPath, ['--input-type=module', '-e', "import {transliterate} from 'transliteration/latin'; console.log(transliterate('São'));"], { cwd: published, encoding: 'utf8', timeout: 5_000 });
check('published-node-latin', '#249', 'ESM named latin import resolves', () => ({ status: esmImport.status, output: esmImport.stdout }), { status: 0, output: 'Sao\n' }, 'working-control');
const cli = spawnSync(process.execPath, [path.join(published, 'dist/bin/transliterate'), '-u', '_', 'foo💩bar'], { encoding: 'utf8', timeout: 5_000 });
check('published-cli', '#97', 'CLI unknown placeholder', () => ({ status: cli.status, output: cli.stdout }), { status: 0, output: 'foo_bar\n' }, 'working-control');

const summary = {
  asOf: '2026-10-22', node: process.version, version: metadata.version,
  cases: results.length,
  bugAssertionsFailing: results.filter(result => result.category === 'confirmed-bug' && !result.matches).length,
  unexpectedControlFailures: results.filter(result => result.category === 'working-control' && !result.matches).length,
  confirmedBugReferences: [...new Set(results.filter(result => result.category === 'confirmed-bug' && !result.matches).map(result => result.issue))],
};
fs.writeFileSync(path.join(dir, 'reproduction-results.json'), JSON.stringify({ summary, results, observations, sizes, artifactMatches, silentSource }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
if (summary.unexpectedControlFailures || (process.argv.includes('--strict') && summary.bugAssertionsFailing)) process.exitCode = 1;
