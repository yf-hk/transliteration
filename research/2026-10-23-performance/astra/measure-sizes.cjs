'use strict';

// Run after runtime measurements; Brotli quality 11 can consume meaningful CPU.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const esbuild = require('esbuild');
const manifest = require(path.join(__dirname, process.argv[2] || 'manifest.json'));

function sizes(source) {
  return {
    bytes: Buffer.byteLength(source),
    gzip9Bytes: zlib.gzipSync(source, { level: 9 }).length,
    brotli11Bytes: zlib.brotliCompressSync(source, { params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
    } }).length,
  };
}

const results = [];
for (const name of manifest.variants) {
  const source = fs.readFileSync(path.join(__dirname, 'variants', `${name}.cjs`), 'utf8');
  const minified = esbuild.transformSync(source, { minify: true, target: 'es2020', format: 'cjs' }).code;
  results.push({ variant: name, source: sizes(source), minified: sizes(minified) });
}
const report = {
  sourceCommit: manifest.sourceCommit,
  node: process.version,
  esbuild: esbuild.version,
  scope: 'Standalone research mapper modules, including lookup, materialize, and metadata exports. Not full API bundles or npm package sizes.',
  commands: 'node research/2026-10-23-performance/astra/measure-sizes.cjs',
  results,
};
fs.writeFileSync(path.join(__dirname, process.argv[3] || 'sizes.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
