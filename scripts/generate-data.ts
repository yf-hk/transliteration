import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const json = JSON.parse(
  readFileSync(join(__dirname, '../data/data.json'), {
    encoding: 'utf8',
  }).toString()
);

const isChinese = (high: number): boolean =>
  (high >= 0x4e && high <= 0x9f) || (high >= 0xf9 && high <= 0xfa);

const isKorean = (high: number): boolean => high >= 0xac && high <= 0xd7;

// Latin range: 0x00-0x02 (Basic Latin + Latin Extended)
const LATIN_MAX = 0x02;

// Build 2D array chunks, skipping Korean (computed at runtime)
const chunks: Record<number, (string | null)[]> = {};
const latinChunks: Record<number, (string | null)[]> = {};

for (let high = 0; high <= 255; high++) {
  if (!Array.isArray(json[high]) || json[high].length === 0) {
    continue;
  }
  if (isKorean(high)) {
    continue; // Korean computed algorithmically
  }

  const chunk: (string | null)[] = [];
  for (let low = 0; low < json[high].length; low++) {
    let v = json[high][low];
    if (v === undefined || v === null || v === '') {
      chunk.push(null);
    } else {
      if (isChinese(high) && typeof v === 'string') {
        v = v.trimEnd();
      }
      chunk.push(v);
    }
  }

  // Trim trailing nulls
  while (chunk.length > 0 && chunk.at(-1) === null) {
    chunk.pop();
  }

  if (chunk.length > 0) {
    chunks[high] = chunk;
    if (high <= LATIN_MAX) {
      latinChunks[high] = chunk;
    }
  }
}

// Create chunks directory
const chunksDir = join(__dirname, '../data/chunks');
if (!existsSync(chunksDir)) {
  mkdirSync(chunksDir, { recursive: true });
}

// Generate individual chunk files
for (const [highStr, chunk] of Object.entries(chunks)) {
  const high = Number(highStr);
  const hex = high.toString(16).padStart(2, '0');
  const chunkCode = `export default ${JSON.stringify(chunk).replace(/null/g, 'null')};`;
  writeFileSync(join(chunksDir, `x${hex}.ts`), chunkCode, { encoding: 'utf8' });
}

// Generate main charmap.ts with 2D array lookup
const chunkImports = Object.keys(chunks)
  .map((h) => {
    const hex = Number(h).toString(16).padStart(2, '0');
    return `import x${hex} from './chunks/x${hex}';`;
  })
  .join('\n');

const chunkAssignments = Object.keys(chunks)
  .map((h) => {
    const hex = Number(h).toString(16).padStart(2, '0');
    return `_[0x${hex}] = x${hex};`;
  })
  .join('\n');

const latinChunkImports = Object.keys(latinChunks)
  .map((h) => {
    const hex = Number(h).toString(16).padStart(2, '0');
    return `import x${hex} from './chunks/x${hex}';`;
  })
  .join('\n');

const latinChunkAssignments = Object.keys(latinChunks)
  .map((h) => {
    const hex = Number(h).toString(16).padStart(2, '0');
    return `_[0x${hex}] = x${hex};`;
  })
  .join('\n');

// Main charmap.ts - full version
const mainCode = `// 2D Array charmap - fastest lookup
// Korean Hangul computed algorithmically (saves 11,172 entries)

${chunkImports}

// Korean Hangul Jamo tables
const I = ['g','gg','n','d','dd','r','m','b','bb','s','ss','','j','jj','c','k','t','p','h'];
const M = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','weo','we','wi','yu','eu','yi','i'];
const F = ['','g','gg','gs','n','nj','nh','d','l','lg','lm','lb','ls','lt','lp','lh','m','b','bs','s','ss','ng','j','c','k','t','p','h'];

export interface Charmap {
  [key: string]: string;
}

// 2D array: _[high][low]
const _: (string | null)[][] = [];
${chunkAssignments}

// Fast lookup function - O(1) with minimal overhead
export function lookup(char: string): string {
  const code = char.charCodeAt(0);
  const high = code >> 8;
  const low = code & 0xff;

  // Check 2D array first
  const chunk = _[high];
  if (chunk) {
    const v = chunk[low];
    if (v) {
      return v;
    }
  }

  // Korean Hangul (computed)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const o = code - 0xac00;
    return I[(o / 588) | 0] + M[((o % 588) / 28) | 0] + F[o % 28];
  }

  return '';
}

// Build plain charmap object for backwards compatibility with setData/deepClone
// This is a plain object that can be cloned and enumerated
export const charmap: Charmap = {};

// Populate from 2D array
for (let high = 0; high < _.length; high++) {
  const chunk = _[high];
  if (!chunk) continue;
  for (let low = 0; low < chunk.length; low++) {
    const v = chunk[low];
    if (v) {
      charmap[String.fromCharCode((high << 8) + low)] = v;
    }
  }
}

// Add Korean Hangul (pre-computed for compatibility)
for (let code = 0xac00; code <= 0xd7a3; code++) {
  const o = code - 0xac00;
  charmap[String.fromCharCode(code)] = I[(o / 588) | 0] + M[((o % 588) / 28) | 0] + F[o % 28];
}
`;

writeFileSync(join(__dirname, '../data/charmap.ts'), mainCode, {
  encoding: 'utf8',
});

// Latin-only charmap - minimal overhead for Latin scripts only
const latinCode = `// Latin-only charmap - minimal bundle for Latin scripts
// Only includes 0x00-0x02 (Basic Latin + Latin Extended)

${latinChunkImports}

export interface Charmap {
  [key: string]: string;
}

// 2D array: _[high][low]
const _: (string | null)[][] = [];
${latinChunkAssignments}

// Fast lookup function - Latin only
export function lookup(char: string): string {
  const code = char.charCodeAt(0);
  const high = code >> 8;
  const low = code & 0xff;

  const chunk = _[high];
  if (chunk) {
    const v = chunk[low];
    if (v) {
      return v;
    }
  }
  return '';
}

// Build plain charmap object for compatibility with setData/deepClone
export const charmap: Charmap = {};

// Populate from 2D array
for (let high = 0; high < _.length; high++) {
  const chunk = _[high];
  if (!chunk) continue;
  for (let low = 0; low < chunk.length; low++) {
    const v = chunk[low];
    if (v) {
      charmap[String.fromCharCode((high << 8) + low)] = v;
    }
  }
}
`;

writeFileSync(join(__dirname, '../data/charmap-latin.ts'), latinCode, {
  encoding: 'utf8',
});

console.log('Generated data/charmap.ts (full)');
console.log('Generated data/charmap-latin.ts (Latin only)');
console.log(`  Chunks: ${Object.keys(chunks).length}`);
console.log(`  Latin chunks: ${Object.keys(latinChunks).length}`);
console.log('  Korean: computed at runtime');
