import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
const { transliterate, slugify } = require('../dist/node/src/node/index.js');
const cli = (name, args = [], options = {}) =>
  spawnSync(process.execPath, [join(root, 'dist/bin', name), ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 1024 * 1024,
    ...options,
  });

test('built Node executables run and report the package version', () => {
  for (const name of ['transliterate', 'slugify']) {
    const result = cli(name, ['--version']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${version}\n`);
  }
});

test('built APIs terminate for empty regex matches and empty ignore entries', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import { transliterate, slugify } from './dist/node/src/node/index.js';
    assert.equal(transliterate('abc', { replace: [[/^/, 'x']] }), 'xabc');
    assert.equal(transliterate('abc', { replaceAfter: [[/$/, 'x']] }), 'abcx');
    assert.equal(transliterate('ab', { replace: [[/(?:)/g, '-']] }), '-a-b-');
    assert.equal(transliterate('🚀', { replace: [[/(?:)/gu, 'x']], unknown: '?' }), 'x?x');
    assert.equal(transliterate('abc', { ignore: [''] }), 'abc');
    assert.equal(slugify('abc', { ignore: [''] }), 'abc');
    assert.equal(transliterate('abc', { replace: [['b', 'x']], ignore: [''] }), 'axc');
  `,
    ],
    { cwd: root, encoding: 'utf8', timeout: 5000 }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});

test('browser script builds expose the documented globals', () => {
  for (const name of ['bundle', 'latin']) {
    const context = createContext({});
    runInContext(
      readFileSync(join(root, `dist/browser/${name}.umd.min.js`), 'utf8'),
      context
    );
    assert.equal(context.transliterate('São Paulo'), 'Sao Paulo');
    assert.equal(context.slugify('São Paulo'), 'sao-paulo');
    assert.equal(context.transl, context.transliterate);
  }
});

test('browser script builds support CommonJS and AMD loaders', () => {
  for (const name of ['bundle', 'latin']) {
    const source = readFileSync(
      join(root, `dist/browser/${name}.umd.min.js`),
      'utf8'
    );
    const commonjs = createContext({ module: { exports: {} } });
    runInContext(source, commonjs);
    assert.equal(commonjs.module.exports.transliterate('São'), 'Sao');
    let amd;
    const define = (factory) => {
      amd = factory();
    };
    define.amd = {};
    runInContext(source, createContext({ define }));
    assert.equal(amd.slugify('São'), 'sao');
  }
});

test('browser ES modules load without sibling assets', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'transliteration-esm-test-'));
  try {
    for (const name of ['bundle', 'latin']) {
      const file = join(dir, `${name}.mjs`);
      writeFileSync(
        file,
        readFileSync(join(root, `dist/browser/${name}.esm.min.js`))
      );
      const api = await import(pathToFileURL(file).href);
      assert.equal(api.transliterate('São'), 'Sao');
      assert.equal(api.transliterate('你好'), name === 'latin' ? '' : 'Ni Hao');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI booleans accept positional text and explicit false', () => {
  for (const [args, expected] of [
    [['-u', 'Hello World'], 'HELLO-WORLD\n'],
    [['Hello World', '--lowercase', 'false'], 'Hello-World\n'],
    [['Hello World', '--lowercase=false'], 'Hello-World\n'],
    [['--no-lowercase', 'Hello World'], 'Hello-World\n'],
    [['Hello World', '-s', '-'], 'hello-world\n'],
    [['Hello World', '-s', ''], 'helloworld\n'],
    [['-l', 'true', '--lowercase', 'false', 'Hello World'], 'Hello-World\n'],
    [['--no-lowercase', '-l', 'Hello World'], 'hello-world\n'],
  ]) {
    const result = cli('slugify', args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, expected);
  }
});

test('invalid CLI boolean values produce a concise error', () => {
  const result = cli('slugify', ['--help=yes']);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'Invalid boolean value for --help: yes\n');
});

test('stdin file results match whole-input API calls across read boundaries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'transliteration-package-test-'));
  try {
    for (const [name, api, input] of [
      ['slugify', slugify, `${'a '.repeat(60_000)}b`],
      ['transliterate', transliterate, '你好'.repeat(24_000)],
    ]) {
      const file = join(dir, 'input.txt');
      writeFileSync(file, input);
      const fd = openSync(file, 'r');
      let result;
      try {
        result = cli(name, ['-S'], { stdio: [fd, 'pipe', 'pipe'] });
      } finally {
        closeSync(fd);
      }
      assert.equal(result.status, 0, result.stderr);
      const expected = `${api(input)}\n`;
      assert.ok(
        result.stdout === expected,
        `${name}: stdin differs from the whole-input result`
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('custom maps accept upper-BMP and supplementary characters and reset', () => {
  for (const api of [transliterate, slugify]) {
    try {
      api.setData(
        { '！': 'CUSTOM', '\ue000': 'PRIVATE', '🚀': 'ROCKET', '\ud800': 'LS' },
        true
      );
      assert.equal(api('！'), api === slugify ? 'custom' : 'CUSTOM');
      assert.equal(api('\ue000'), api === slugify ? 'private' : 'PRIVATE');
      assert.equal(api('🚀'), api === slugify ? 'rocket' : 'ROCKET');
      assert.equal(api('x\ud800y'), api === slugify ? 'xlsy' : 'xLSy');
    } finally {
      api.setData(undefined, true);
    }
  }
});

test('ignored whole tokens survive slug sanitization', () => {
  assert.equal(slugify('foo:bar', { ignore: ['foo:bar'] }), 'foo:bar');
  assert.equal(slugify('foo你好bar', { ignore: ['foo你好bar'] }), 'foo你好bar');
  assert.equal(
    slugify('I love C++ and C#', { ignore: ['C++', 'C#'] }),
    'i-love-c++-and-c#'
  );
  assert.equal(
    transliterate('你好', { ignore: ['你好'], replace: { 好: 'Good' } }),
    '你好'
  );
});

test('multi-character separators collapse and trim as whole strings', () => {
  assert.equal(slugify('-_-_a-_-_', { separator: '-_' }), 'a');
  assert.equal(slugify('a-_-_b', { separator: '-_' }), 'a-_b');
});

test('slug cleanup protects ignored text produced by transliteration', () => {
  assert.equal(slugify('foo：bar', { ignore: [':'] }), 'foo:bar');
  assert.equal(slugify('Ĉ# rocks', { ignore: ['C#'] }), 'c#-rocks');
  assert.equal(slugify('北京 Plaza', { ignore: ['Jing P'] }), 'bei-jing plaza');
});

test('Latin builds are small and retain Latin data on reset', () => {
  for (const file of [
    'dist/node/src/node/latin.js',
    'dist/browser/latin.umd.min.js',
    'dist/browser/latin.esm.min.js',
  ]) {
    assert.ok(
      statSync(join(root, file)).size < 20_000,
      `${file} includes too much data`
    );
  }
  const latin = require('../dist/node/src/node/latin.js');
  for (const api of [latin.transliterate, latin.slugify]) {
    api.setData({ 你: 'CUSTOM' });
    api.setData(undefined, true);
    assert.equal(api('你好'), '');
    assert.equal(api('São'), api === latin.slugify ? 'sao' : 'Sao');
  }
});
