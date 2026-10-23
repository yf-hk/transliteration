'use strict';

// Build additional variants from the baseline prototypes without modifying them.
const fs = require('node:fs');
const path = require('node:path');
const baseManifest = require('./manifest.json');
const directory = path.join(__dirname, 'variants');

function replaceExactlyOnce(source, oldText, newText) {
  if (source.split(oldText).length !== 2) throw new Error(`Expected one occurrence of ${oldText}`);
  return source.replace(oldText, newText);
}

function variant(base, name, transform, extraMetadata) {
  let source = fs.readFileSync(path.join(directory, `${base}.cjs`), 'utf8');
  const metadataLine = source.match(/^const metadata=(.+);$/m);
  if (!metadataLine) throw new Error('Missing source metadata');
  const metadata = { ...JSON.parse(metadataLine[1]), variant: name, ...extraMetadata };
  source = transform(source);
  source = replaceExactlyOnce(source, metadataLine[0], `const metadata=${JSON.stringify(metadata)};`);
  fs.writeFileSync(path.join(directory, `${name}.cjs`), source);
}

variant('pooled-offsets', 'pooled-offsets-memo', (source) => {
  source = replaceExactlyOnce(source, 'const pool=', `const cache=new Array(${baseManifest.uniqueStaticValues + 1});cache[1]='';\nconst pool=`);
  return replaceExactlyOnce(source,
    'return pool.slice(offsets[id],offsets[id+1]);',
    'let value=cache[id];if(value===undefined){value=pool.slice(offsets[id],offsets[id+1]);cache[id]=value;}return value;');
}, {
  representation: 'Uint16 page/value IDs, ASCII pool, and lazy decoded-string cache by value ID',
  cacheSlots: baseManifest.uniqueStaticValues + 1,
  cacheScope: 'Each unique non-Hangul value is sliced at most once; ID0 remains missing and ID1 is the empty string.',
});

variant('packed12-values', 'packed12-hangul-prefix', (source) => replaceExactlyOnce(source,
  'function hangul(code){const o=code-0xac00;return I[(o/588)|0]+M[((o%588)/28)|0]+F[o%28];}',
  'const H=[];for(const initial of I)for(const medial of M)H.push(initial+medial);\nfunction hangul(code){const o=code-0xac00;return H[(o/28)|0]+F[o%28];}'), {
  representation: '12-bit text transport and Uint16 IDs, with 399 precomputed Hangul initial-plus-vowel prefixes',
  hangulPrefixes: 399,
});

variant('packed12-values', 'packed12-codepoints', (source) => {
  source = replaceExactlyOnce(source,
    'function lookup(char){if(char.length!==1)return undefined;const code=char.charCodeAt(0);if(code>=0xac00&&code<=0xd7a3)return hangul(code);return values[ids[(pageIndex[code>>>8]<<8)|(code&255)]];}',
    'function lookupCode(code){if(code>0xffff)return undefined;if(code>=0xac00&&code<=0xd7a3)return hangul(code);return values[ids[(pageIndex[code>>>8]<<8)|(code&255)]];}\nfunction lookup(char){if(char.length!==1)return undefined;return lookupCode(char.charCodeAt(0));}');
  return replaceExactlyOnce(source, 'module.exports={lookup,materialize,metadata};', 'module.exports={lookup,lookupCode,materialize,metadata};');
}, {
  representation: '12-bit text transport and Uint16 IDs, with an internal numeric-code-point lookup',
  lookupCodeContract: 'Input is an integer from 0 through 0x10ffff obtained from the engine string scan; missing supplementary mappings return undefined.',
});

variant('packed12-codepoints', 'packed12-codepoints-target', source=>replaceExactlyOnce(source,
  'function materialize(){const result={};',
  'function materialize(result={}){'), {
  representation: '12-bit text transport with numeric lookup and direct materialization into an optional target object',
});

const manifest = { ...baseManifest, variants: ['pooled-offsets-memo', 'packed12-hangul-prefix', 'packed12-codepoints', 'packed12-codepoints-target'] };
fs.writeFileSync(path.join(__dirname, 'followup-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
