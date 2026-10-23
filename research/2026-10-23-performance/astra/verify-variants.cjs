'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '../../..');
const manifest = require(path.join(__dirname, process.argv[2] || 'manifest.json'));
const result = esbuild.buildSync({
  entryPoints: [path.join(root, 'data/charmap.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
});
const sourceModule = new Module('current-generated-charmap', module);
sourceModule._compile(result.outputFiles[0].text, 'current-generated-charmap.cjs');
const expected = sourceModule.exports.charmap;

const results = [];
for (const name of manifest.variants) {
  const candidate = require(`./variants/${name}.cjs`);
  for (let code = 0; code <= 0xffff; code++) {
    const char = String.fromCharCode(code);
    assert.equal(candidate.lookup(char), expected[char], `${name}: U+${code.toString(16)}`);
    if (candidate.lookupCode) assert.equal(candidate.lookupCode(code), expected[char], `${name}: numeric U+${code.toString(16)}`);
  }
  const materialized = candidate.materialize();
  assert.deepEqual(materialized, expected, `${name}: enumeration`);
  for (const char of ['🚀', '𠀀', '𝔸', '\u{10ffff}']) {
    assert.equal(candidate.lookup(char), undefined, `${name}: unsupported supplementary character`);
    if (candidate.lookupCode) assert.equal(candidate.lookupCode(char.codePointAt(0)), undefined, `${name}: numeric supplementary miss`);
  }
  assert.equal(candidate.lookup('ъ'), '', `${name}: explicit empty`);
  assert.equal(candidate.lookup('\u0378'), undefined, `${name}: missing`);
  assert.equal(candidate.lookup('\ud800'), undefined, `${name}: lone surrogate`);
  assert.equal(Object.keys(materialized).length, manifest.totalMappings);
  results.push({ variant: name, bmpLookupsCompared: 65536, materializedMappings: Object.keys(materialized).length, supplementaryMissCases: 4, passed: true });
}
const summary = {
  sourceCommit: manifest.sourceCommit,
  dataSha256: manifest.dataSha256,
  method: 'Exhaustive BMP lookup and exact materialized-object comparison against the current generated data/charmap.ts bundled in memory with esbuild.',
  scope: 'Mapper representation parity only. End-to-end config, ignore, replacements, custom mappings and spacing require root integration verification.',
  results,
};
fs.writeFileSync(path.join(__dirname, process.argv[3] || 'correctness.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
