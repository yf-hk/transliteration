'use strict';

// Build alternative representations of the current generator's full mapping.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { gzipSync } = require('node:zlib');

const root = path.resolve(__dirname, '../../..');
const output = path.join(__dirname, 'variants');
fs.mkdirSync(output, { recursive: true });
const raw = fs.readFileSync(path.join(root, 'data/data.json'));
const source = JSON.parse(raw);
const pages = Array(256).fill(null);
const idsByValue = new Map([['', 1]]);
const values = [null, ''];
const bmpIds = new Uint16Array(65536);
let count = 0;
let explicitEmpty = 0;

for (let high = 0; high < 256; high++) {
  if (high >= 0xac && high <= 0xd7) continue;
  if (!Array.isArray(source[high]) || !source[high].length) continue;
  const page = source[high].map((value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') throw new Error('Non-string mapped value');
    if ((high >= 0x4e && high <= 0x9f) || (high >= 0xf9 && high <= 0xfa)) {
      value = value.trimEnd();
    }
    if (/[^\x00-\x7f]/.test(value)) throw new Error('Expected ASCII mapping');
    count++;
    if (value === '') explicitEmpty++;
    if (!idsByValue.has(value)) {
      idsByValue.set(value, values.length);
      values.push(value);
    }
    return value;
  });
  while (page.at(-1) === null) page.pop();
  if (page.length) pages[high] = page;
  for (let low = 0; low < page.length; low++) {
    if (page[low] !== null) bmpIds[(high << 8) | low] = idsByValue.get(page[low]);
  }
}

let pool = '';
const offsets = new Uint16Array(values.length + 1);
for (let id = 1; id < values.length; id++) {
  offsets[id] = pool.length;
  pool += values[id];
  offsets[id + 1] = pool.length;
}
if (pool.length > 65535 || values.length > 65535) {
  throw new Error('Uint16 limits exceeded; generator must select a wider format');
}

const pageIndex = new Uint16Array(256);
const pageWords = new Uint16Array((pages.filter(Boolean).length + 1) * 256);
let pageId = 1;
for (let high = 0; high < 256; high++) {
  if (!pages[high]) continue;
  pageIndex[high] = pageId;
  pageWords.set(bmpIds.subarray(high << 8, (high + 1) << 8), pageId << 8);
  pageId++;
}

function wordsToBase64(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = Buffer.alloc(length * 2);
  let offset = 0;
  for (const part of parts) for (const word of part) {
    bytes.writeUInt16LE(word, offset);
    offset += 2;
  }
  return bytes.toString('base64');
}

function wordsTo12BitText(parts) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (const part of parts) for (const word of part) {
    if (word > 4095) throw new Error('12-bit format exceeded; select wider transport');
    result += alphabet[word >>> 6] + alphabet[word & 63];
  }
  return result;
}

const candidates = [];
for (let shift = 4; shift <= 8; shift++) {
  const blockSize = 1 << shift;
  const index = new Uint16Array(65536 >>> shift);
  const blockIds = new Map();
  const blocks = [];
  for (let start = 0; start < 65536; start += blockSize) {
    const block = Array.from(bmpIds.subarray(start, start + blockSize));
    const key = block.join(',');
    let id = blockIds.get(key);
    if (id === undefined) {
      id = blocks.length;
      blockIds.set(key, id);
      blocks.push(block);
    }
    index[start >>> shift] = id;
  }
  const words = Uint16Array.from(blocks.flat());
  const base64 = wordsToBase64([index, words]);
  candidates.push({ shift, index, words, blockCount: blocks.length,
    bytes: (index.length + words.length) * 2,
    base64GzipBytes: gzipSync(base64, { level: 9 }).length });
}
// Compare the smallest retained table against regular pages. The gzip minimum
// is reported separately; for this data it is the existing 256-entry page width.
const chosen = [...candidates].sort((a, b) => a.bytes - b.bytes)[0];

const provenance = {
  generatedBy: 'Astra, requested max effort',
  sourceCommit: 'd1be1f35e48911b00377dcf5efd299aa74d50000',
  dataSha256: crypto.createHash('sha256').update(raw).digest('hex'),
  staticMappings: count,
  algorithmicHangulMappings: 11172,
  totalMappings: count + 11172,
  explicitEmpty,
  uniqueStaticValues: values.length - 1,
  uniquePoolAsciiBytes: pool.length,
  pageCount: pages.filter(Boolean).length,
  maxValueLength: Math.max(...values.slice(1).map((v) => v.length)),
};

const hangul = `const I=['g','gg','n','d','dd','r','m','b','bb','s','ss','','j','jj','c','k','t','p','h'];
const M=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','weo','we','wi','yu','eu','yi','i'];
const F=['','g','gg','gs','n','nj','nh','d','l','lg','lm','lb','ls','lt','lp','lh','m','b','bs','s','ss','ng','j','c','k','t','p','h'];
function hangul(code){const o=code-0xac00;return I[(o/588)|0]+M[((o%588)/28)|0]+F[o%28];}
`;

// Decode explicitly little-endian bytes into numeric Uint16 elements. This has
// no Node Buffer or atob dependency, and no host-endianness assumption.
const decode16 = `function decode16(encoded){
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const rev=new Uint8Array(128);for(let i=0;i<64;i++)rev[alphabet.charCodeAt(i)]=i;
const end=encoded.length-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0);
const out=new Uint16Array((end*6/8)>>>1);
let bits=0,acc=0,lo=0,byte=0;
for(let i=0;i<end;i++){acc=(acc<<6)|rev[encoded.charCodeAt(i)];bits+=6;
if(bits>=8){bits-=8;const v=(acc>>>bits)&255;if(byte&1)out[byte>>>1]=lo|(v<<8);else lo=v;byte++;}}
return out;
}
`;

const materializer = `function materialize(){const result={};for(let code=0;code<=0xffff;code++){const char=String.fromCharCode(code);const value=lookup(char);if(value!==undefined)result[char]=value;}return result;}
`;

function save(name, body, extra) {
  const metadata = { ...provenance, variant: name, ...extra };
  fs.writeFileSync(path.join(output, `${name}.cjs`), `'use strict';\n${body}\nconst metadata=${JSON.stringify(metadata)};\nmodule.exports={lookup,materialize,metadata};\n`);
}

save('eager-object', `${hangul}
const pages=${JSON.stringify(pages)};
const map={};
for(let high=0;high<pages.length;high++){const page=pages[high];if(!page)continue;for(let low=0;low<page.length;low++){const value=page[low];if(typeof value==='string')map[String.fromCharCode((high<<8)+low)]=value;}}
for(let code=0xac00;code<=0xd7a3;code++)map[String.fromCharCode(code)]=hangul(code);
function lookup(char){return map[char];}
function materialize(){return {...map};}
`, { representation: 'current eager object materialization', retainedTypedArrayBytes: 0 });

save('pages', `${hangul}
const pages=${JSON.stringify(pages)};
function lookup(char){if(char.length!==1)return undefined;const code=char.charCodeAt(0);const page=pages[code>>>8];if(page){const value=page[code&255];if(value!==null&&value!==undefined)return value;}if(code>=0xac00&&code<=0xd7a3)return hangul(code);return undefined;}
${materializer}`, { representation: 'direct string pages and algorithmic Hangul', retainedTypedArrayBytes: 0 });

const pageTable = `${decode16}
const words=decode16(${JSON.stringify(wordsToBase64([pageIndex, pageWords, offsets]))});
const pageIndex=words.subarray(0,256);
const ids=words.subarray(256,${256 + pageWords.length});
const offsets=words.subarray(${256 + pageWords.length});
`;

save('pooled-offsets', `${hangul}${pageTable}
const pool=${JSON.stringify(pool)};
function lookup(char){if(char.length!==1)return undefined;const code=char.charCodeAt(0);if(code>=0xac00&&code<=0xd7a3)return hangul(code);const id=ids[(pageIndex[code>>>8]<<8)|(code&255)];if(id===0)return undefined;return pool.slice(offsets[id],offsets[id+1]);}
${materializer}`, { representation: 'Uint16 page/value IDs and ASCII pool slices', retainedTypedArrayBytes: (256 + pageWords.length + offsets.length) * 2 });

const valuePageTable = `${decode16}
const words=decode16(${JSON.stringify(wordsToBase64([pageIndex, pageWords]))});
const pageIndex=words.subarray(0,256);
const ids=words.subarray(256);
const values=${JSON.stringify(values).replace(/^\[null,/, '[undefined,')};
`;

save('pooled-values', `${hangul}${valuePageTable}
function lookup(char){if(char.length!==1)return undefined;const code=char.charCodeAt(0);if(code>=0xac00&&code<=0xd7a3)return hangul(code);return values[ids[(pageIndex[code>>>8]<<8)|(code&255)]];}
${materializer}`, { representation: 'Uint16 page/value IDs and unique JS strings', retainedTypedArrayBytes: (256 + pageWords.length) * 2 });

save('pooled-blocks', `${hangul}${decode16}
const words=decode16(${JSON.stringify(wordsToBase64([chosen.index, chosen.words]))});
const blockIndex=words.subarray(0,${chosen.index.length});
const ids=words.subarray(${chosen.index.length});
const values=${JSON.stringify(values).replace(/^\[null,/, '[undefined,')};
function lookup(char){if(char.length!==1)return undefined;const code=char.charCodeAt(0);if(code>=0xac00&&code<=0xd7a3)return hangul(code);return values[ids[(blockIndex[code>>>${chosen.shift}]<<${chosen.shift})|(code&${(1 << chosen.shift) - 1})]];}
${materializer}`, { representation: 'deduplicated blocks of Uint16 IDs and unique JS strings', blockShift: chosen.shift, uniqueBlocks: chosen.blockCount, retainedTypedArrayBytes: chosen.bytes });

// Transport and runtime formats do not have to match: 3,576 values fit in
// 12-bit IDs, but an ordinary Uint16Array is convenient for the hot lookup.
save('packed12-values', `${hangul}
function decode12(encoded){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';const rev=new Uint8Array(128);for(let i=0;i<64;i++)rev[alphabet.charCodeAt(i)]=i;const out=new Uint16Array(encoded.length>>>1);for(let i=0,j=0;i<encoded.length;i+=2,j++)out[j]=(rev[encoded.charCodeAt(i)]<<6)|rev[encoded.charCodeAt(i+1)];return out;}
const words=decode12(${JSON.stringify(wordsTo12BitText([pageIndex, pageWords]))});
const pageIndex=words.subarray(0,256);
const ids=words.subarray(256);
const values=${JSON.stringify(values).replace(/^\[null,/, '[undefined,')};
function lookup(char){if(char.length!==1)return undefined;const code=char.charCodeAt(0);if(code>=0xac00&&code<=0xd7a3)return hangul(code);return values[ids[(pageIndex[code>>>8]<<8)|(code&255)]];}
${materializer}`, { representation: '12-bit text transport decoded to Uint16 page/value IDs and unique JS strings', retainedTypedArrayBytes: (256 + pageWords.length) * 2, transportBitsPerId: 12 });

const manifest = {
  ...provenance,
  variants: ['eager-object', 'pages', 'pooled-offsets', 'pooled-values', 'pooled-blocks', 'packed12-values'],
  blockCandidates: candidates.map(({ shift, blockCount, bytes, base64GzipBytes }) => ({ shift, blockCount, bytes, base64GzipBytes })),
  selectedBlockShift: chosen.shift,
  gzipOptimalBlockShift: [...candidates].sort((a, b) => a.base64GzipBytes - b.base64GzipBytes)[0].shift,
};
fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
