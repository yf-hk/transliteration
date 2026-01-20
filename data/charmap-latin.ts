// Latin-only charmap - minimal bundle for Latin scripts
// Only includes 0x00-0x02 (Basic Latin + Latin Extended)

import x00 from './chunks/x00';
import x01 from './chunks/x01';
import x02 from './chunks/x02';

export interface Charmap {
  [key: string]: string;
}

// 2D array: _[high][low]
const _: (string | null)[][] = [];
_[0x00] = x00;
_[0x01] = x01;
_[0x02] = x02;

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
