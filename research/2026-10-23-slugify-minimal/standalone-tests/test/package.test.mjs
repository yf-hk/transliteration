import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { delimiter, dirname, join, resolve, sep } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import { installPackedPackage } from './package-helpers.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const { directory, consumer, root, manifest, require, cleanup } =
  installPackedPackage(repositoryRoot);
after(cleanup);

const { version } = manifest;
const { transliterate, slugify } = require('transliteration');
const cli = (name, args = [], options = {}) =>
  spawnSync(process.execPath, [join(root, 'dist/bin', name), ...args], {
    cwd: consumer,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 1024 * 1024,
    ...options,
  });

const assertBrowserApi = (api, name) => {
  assert.deepEqual(Object.keys(api).sort(), [
    'slugify',
    'transl',
    'transliterate',
  ]);
  assert.equal(api.transl, api.transliterate);
  for (const method of [api.transliterate, api.slugify]) {
    assert.equal(typeof method.config, 'function');
    assert.equal(typeof method.setData, 'function');
  }
  assert.equal(api.transliterate('São'), 'Sao');
  assert.equal(api.slugify('São'), 'sao');
  assert.equal(api.transliterate('你好'), name === 'latin' ? '' : 'Ni Hao');
};

test('packed installation has no runtime dependencies', () => {
  for (const field of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    assert.deepEqual(Object.keys(manifest[field] ?? {}), [], field);
  }
  const installed = readdirSync(join(consumer, 'node_modules')).filter(
    (name) => name !== '.bin' && name !== '.package-lock.json'
  );
  assert.deepEqual(installed, ['transliteration']);
});

test('packed metadata preserves Node, browser, CDN, and legacy entry points', () => {
  const expectedPaths = {
    main: 'dist/node/src/node/index.js',
    module: 'dist/browser/bundle.esm.min.js',
    jsnext: 'dist/browser/bundle.esm.min.js',
    browser: 'dist/browser/bundle.umd.min.js',
    jsdelivr: 'dist/browser/bundle.umd.min.js',
    types: 'dist/node/src/node/index.d.ts',
  };
  for (const [field, path] of Object.entries(expectedPaths)) {
    assert.equal(manifest[field], path, field);
    assert.ok(statSync(join(root, path)).isFile(), path);
  }
  assert.equal(manifest.unpkg, undefined);
  assert.deepEqual(manifest.bin, {
    transliterate: 'dist/bin/transliterate',
    slugify: 'dist/bin/slugify',
  });
  for (const [subpath, name] of [
    ['.', 'index'],
    ['./latin', 'latin'],
  ]) {
    const browser = name === 'index' ? 'bundle' : 'latin';
    const node = `./dist/node/src/node/${name}`;
    assert.deepEqual(manifest.exports[subpath], {
      types: `${node}.d.ts`,
      browser: `./dist/browser/${browser}.esm.min.js`,
      require: `${node}.js`,
      import: `${node}.js`,
      default: `${node}.js`,
    });
    const declaration = join(root, `${node}.d.ts`);
    assert.ok(statSync(declaration).isFile());
    const source = readFileSync(declaration, 'utf8');
    for (const reference of source.matchAll(
      /^\s*\/\/[#@]\s*sourceMappingURL=(\S+)/gm
    )) {
      const map = resolve(dirname(declaration), reference[1]);
      assert.ok(map.startsWith(`${root}${sep}`), map);
      assert.ok(statSync(map).isFile(), map);
    }
    assert.ok(statSync(join(root, `${node}.js.map`)).isFile());
  }
  assert.equal(manifest.exports['./dist/*'], './dist/*');
  assert.equal(manifest.exports['./package.json'], './package.json');
  assert.equal(require('transliteration/package.json').version, version);

  for (const [specifier, name] of [
    ['transliteration', 'index'],
    ['transliteration/latin', 'latin'],
  ]) {
    const legacy = `transliteration/dist/node/src/node/${name}.js`;
    assert.equal(
      require.resolve(specifier),
      join(root, `dist/node/src/node/${name}.js`)
    );
    assert.equal(require(specifier), require(legacy));
    assert.equal(require(specifier).transliterate('São'), 'Sao');
  }
  for (const name of ['bundle', 'latin']) {
    for (const format of ['umd', 'esm']) {
      const path = `dist/browser/${name}.${format}.min.js`;
      assert.equal(
        require.resolve(`transliteration/${path}`),
        join(root, path)
      );
    }
  }
});

test('browser export conditions resolve to the standalone ES modules', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--conditions=browser',
      '-e',
      `console.log(JSON.stringify(
        ['transliteration', 'transliteration/latin'].map((name) => require.resolve(name))
      ));`,
    ],
    { cwd: consumer, encoding: 'utf8', timeout: 5000 }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [
    join(root, 'dist/browser/bundle.esm.min.js'),
    join(root, 'dist/browser/latin.esm.min.js'),
  ]);
});

test('packed root and Latin entries support Node ES module imports', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
      import assert from 'node:assert/strict';
      import { transliterate, slugify } from 'transliteration';
      import { transliterate as latin } from 'transliteration/latin';
      import { transliterate as legacy } from 'transliteration/dist/node/src/node/index.js';
      assert.equal(transliterate, legacy);
      assert.equal(transliterate('你好'), 'Ni Hao');
      assert.equal(slugify('São'), 'sao');
      assert.equal(latin('你好'), '');
      assert.equal(latin('São'), 'Sao');
      `,
    ],
    { cwd: consumer, encoding: 'utf8', timeout: 5000 }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});

test('packed Node executables run and report the package version', () => {
  for (const name of ['transliterate', 'slugify']) {
    assert.ok(statSync(join(root, manifest.bin[name])).isFile());
    const result = cli(name, ['--version']);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${version}\n`);

    const installed = spawnSync(
      join(consumer, 'node_modules', '.bin', name),
      ['--version'],
      {
        cwd: consumer,
        encoding: 'utf8',
        timeout: 5000,
        env: {
          ...process.env,
          PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`,
        },
      }
    );
    assert.equal(installed.error, undefined);
    assert.equal(installed.status, 0, installed.stderr);
    assert.equal(installed.stdout, `${version}\n`);
  }
});

test('packed APIs terminate for empty regex matches and empty ignore entries', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import { transliterate, slugify } from 'transliteration';
    assert.equal(transliterate('abc', { replace: [[/^/, 'x']] }), 'xabc');
    assert.equal(transliterate('abc', { replaceAfter: [[/$/, 'x']] }), 'abcx');
    assert.equal(transliterate('ab', { replace: [[/(?:)/g, '-']] }), '-a-b-');
    assert.equal(transliterate('🚀', { replace: [[/(?:)/gu, 'x']], unknown: '?' }), 'x?x');
    assert.equal(transliterate('abc', { ignore: [''] }), 'abc');
    assert.equal(slugify('abc', { ignore: [''] }), 'abc');
    assert.equal(transliterate('abc', { replace: [['b', 'x']], ignore: [''] }), 'axc');
  `,
    ],
    { cwd: consumer, encoding: 'utf8', timeout: 5000 }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});

test('browser script builds expose the documented globals', () => {
  for (const name of ['bundle', 'latin']) {
    const context = createContext({});
    runInContext(
      readFileSync(join(root, `dist/browser/${name}.umd.min.js`), 'utf8'),
      context,
      { timeout: 5000 }
    );
    assertBrowserApi(context.transliteration, name);
    for (const key of ['transliterate', 'slugify', 'transl']) {
      assert.equal(context[key], context.transliteration[key]);
    }
    assert.equal(context.transliterate('São Paulo'), 'Sao Paulo');
    assert.equal(context.slugify('São Paulo'), 'sao-paulo');
    assert.equal(context.transliterate('ýÝ ẞ ᴀ ₐ ①'), 'yY SS A a 1');
    assert.equal(context.slugify('STRAẞE'), 'strasse');
    assert.equal(
      context.slugify('Hello World', { allowedChars: undefined }),
      'hello-world'
    );
    context.transliterate.setData({ x: '' });
    assert.equal(context.transliterate('axb', { unknown: '?' }), 'ab');
    context.transliterate.setData(undefined, true);
    assert.equal(context.transliterate('ẞ'), 'SS');
    if (name === 'bundle') {
      assert.equal(context.transliterate('ъ🚀', { unknown: '?' }), '?');
      assert.equal(
        context.slugify('2022年中文01英文nihao02'),
        '2022-nian-zhong-wen-01-ying-wen-nihao-02'
      );
    }
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
    runInContext(source, commonjs, { timeout: 5000 });
    assertBrowserApi(commonjs.module.exports, name);
    assert.equal(commonjs.transliterate, undefined);
    let amd;
    const define = (factory) => {
      amd = factory();
    };
    define.amd = {};
    const amdContext = createContext({ define });
    runInContext(source, amdContext, { timeout: 5000 });
    assertBrowserApi(amd, name);
    assert.equal(amdContext.transliterate, undefined);

    const unexpectedAmd = () =>
      assert.fail('CommonJS must take priority over AMD');
    unexpectedAmd.amd = {};
    const both = createContext({
      module: { exports: {} },
      define: unexpectedAmd,
    });
    runInContext(source, both, { timeout: 5000 });
    assertBrowserApi(both.module.exports, name);
  }
});

test('browser ES modules load without sibling assets or installed packages', async () => {
  for (const name of ['bundle', 'latin']) {
    const source = readFileSync(join(root, `dist/browser/${name}.esm.min.js`));
    const api = await import(
      `data:text/javascript;base64,${source.toString('base64')}`
    );
    assertBrowserApi(api, name);
    assert.equal(api.transliterate('ýÝ ẞ ᴀ ₐ ①'), 'yY SS A a 1');
    assert.equal(
      api.slugify('Hello World', { allowedChars: undefined }),
      'hello-world'
    );
  }
});

test('browser bundles include their referenced source maps', () => {
  for (const name of ['bundle', 'latin']) {
    for (const format of ['umd', 'esm']) {
      const filename = `${name}.${format}.min.js`;
      const source = readFileSync(join(root, 'dist/browser', filename), 'utf8');
      const reference = /sourceMappingURL=(\S+)/.exec(source)?.[1];
      assert.equal(reference, `${filename}.map`);
      const map = JSON.parse(
        readFileSync(join(root, 'dist/browser', reference), 'utf8')
      );
      assert.equal(map.version, 3);
      assert.ok(map.sources.length > 0);
      assert.equal(map.sourcesContent.length, map.sources.length);
      assert.ok(
        map.sourcesContent.every((content) => typeof content === 'string')
      );
      assert.equal(typeof map.mappings, 'string');
      assert.ok(map.mappings.length > 0);
    }
  }
});

test('packed Node exports retain the issue fixes after data reset', () => {
  for (const name of ['index', 'latin']) {
    const api = require(`transliteration/dist/node/src/node/${name}.js`);
    assert.equal(api.transliterate('ýÝ ẞ ᴀ ₐ ①'), 'yY SS A a 1');
    assert.equal(api.slugify('STRAẞE'), 'strasse');
    assert.equal(
      api.slugify('Hello World', { allowedChars: undefined }),
      'hello-world'
    );
    assert.equal(
      api.slugify('Hello World', { allowedChars: null }),
      'hello-world'
    );
    try {
      api.transliterate.setData({ x: '' });
      assert.equal(api.transliterate('axb🚀', { unknown: '?' }), 'ab?');
    } finally {
      api.transliterate.setData(undefined, true);
    }
    assert.equal(api.transliterate('ẞ'), 'SS');
    if (name === 'index') {
      assert.equal(api.transliterate('ъ🚀', { unknown: '?' }), '?');
      assert.equal(api.slugify('hello世界'), 'hello-shi-jie');
      assert.equal(
        api.slugify('2022年中文01英文nihao02'),
        '2022-nian-zhong-wen-01-ying-wen-nihao-02'
      );
    }
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
  const dir = mkdtempSync(join(directory, 'stdin-'));
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
  const latin = require('transliteration/latin');
  for (const api of [latin.transliterate, latin.slugify]) {
    api.setData({ 你: 'CUSTOM' });
    api.setData(undefined, true);
    assert.equal(api('你好'), '');
    assert.equal(api('São'), api === latin.slugify ? 'sao' : 'Sao');
  }
});
