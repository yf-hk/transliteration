import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const json = JSON.parse(
  readFileSync(join(__dirname, '../data/data.json'), {
    encoding: 'utf8',
  }).toString()
);

const codemap: (string | null)[][] = [];
const lastIndex = 255;
const isChinese = (low: number): boolean =>
  (low >= 0x4e && low <= 0x9f) || (low >= 0xf9 && low <= 0xfa);

for (let i = 0; i <= lastIndex; i++) {
  if (!Array.isArray(json[i]) || json[i].length === 0) {
    codemap.push([]);
  } else {
    codemap[i] = [];
    for (let j = 0; j < json[i].length; j++) {
      if (
        json[i][j] === undefined ||
        json[i][j] === null ||
        json[i][j] === ''
      ) {
        json[i][j] = null;
      }
      if (isChinese(i) && typeof json[i][j] === 'string') {
        json[i][j] = json[i][j].trimEnd();
      }
      codemap[i].push(json[i][j]);
    }
    while (
      codemap[i].length &&
      codemap[i].lastIndexOf(null) === codemap[i].length - 1
    ) {
      codemap[i].pop();
    }
  }
}

const code = `type Input = (string | undefined)[][] | undefined;
let arr: Input = ${JSON5.stringify(codemap).replace(/null/g, '')};
export interface Charmap {
  [key: string]: string
}
export const charmap: Charmap = {};
for (let high = 0; high < arr!.length; high++) {
  for (let low = 0; low < arr![high].length; low++) {
    const value = arr![high][low];
    if (typeof value === 'string' && value.length) {
      const char = String.fromCharCode((high << 8) + low);
      charmap[char] = value;
    }
  }
}
arr = undefined;
`;

writeFileSync(join(__dirname, '../data/charmap.ts'), code, {
  encoding: 'utf8',
});

console.log('Generated data/charmap.ts');
