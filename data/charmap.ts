// 2D Array charmap - fastest lookup
// Korean Hangul computed algorithmically (saves 11,172 entries)

import x00 from './chunks/x00';
import x01 from './chunks/x01';
import x02 from './chunks/x02';
import x03 from './chunks/x03';
import x04 from './chunks/x04';
import x05 from './chunks/x05';
import x06 from './chunks/x06';
import x07 from './chunks/x07';
import x09 from './chunks/x09';
import x0a from './chunks/x0a';
import x0b from './chunks/x0b';
import x0c from './chunks/x0c';
import x0d from './chunks/x0d';
import x0e from './chunks/x0e';
import x0f from './chunks/x0f';
import x10 from './chunks/x10';
import x11 from './chunks/x11';
import x12 from './chunks/x12';
import x13 from './chunks/x13';
import x14 from './chunks/x14';
import x15 from './chunks/x15';
import x16 from './chunks/x16';
import x17 from './chunks/x17';
import x18 from './chunks/x18';
import x1e from './chunks/x1e';
import x1f from './chunks/x1f';
import x20 from './chunks/x20';
import x21 from './chunks/x21';
import x25 from './chunks/x25';
import x28 from './chunks/x28';
import x30 from './chunks/x30';
import x31 from './chunks/x31';
import x32 from './chunks/x32';
import x33 from './chunks/x33';
import x4e from './chunks/x4e';
import x4f from './chunks/x4f';
import x50 from './chunks/x50';
import x51 from './chunks/x51';
import x52 from './chunks/x52';
import x53 from './chunks/x53';
import x54 from './chunks/x54';
import x55 from './chunks/x55';
import x56 from './chunks/x56';
import x57 from './chunks/x57';
import x58 from './chunks/x58';
import x59 from './chunks/x59';
import x5a from './chunks/x5a';
import x5b from './chunks/x5b';
import x5c from './chunks/x5c';
import x5d from './chunks/x5d';
import x5e from './chunks/x5e';
import x5f from './chunks/x5f';
import x60 from './chunks/x60';
import x61 from './chunks/x61';
import x62 from './chunks/x62';
import x63 from './chunks/x63';
import x64 from './chunks/x64';
import x65 from './chunks/x65';
import x66 from './chunks/x66';
import x67 from './chunks/x67';
import x68 from './chunks/x68';
import x69 from './chunks/x69';
import x6a from './chunks/x6a';
import x6b from './chunks/x6b';
import x6c from './chunks/x6c';
import x6d from './chunks/x6d';
import x6e from './chunks/x6e';
import x6f from './chunks/x6f';
import x70 from './chunks/x70';
import x71 from './chunks/x71';
import x72 from './chunks/x72';
import x73 from './chunks/x73';
import x74 from './chunks/x74';
import x75 from './chunks/x75';
import x76 from './chunks/x76';
import x77 from './chunks/x77';
import x78 from './chunks/x78';
import x79 from './chunks/x79';
import x7a from './chunks/x7a';
import x7b from './chunks/x7b';
import x7c from './chunks/x7c';
import x7d from './chunks/x7d';
import x7e from './chunks/x7e';
import x7f from './chunks/x7f';
import x80 from './chunks/x80';
import x81 from './chunks/x81';
import x82 from './chunks/x82';
import x83 from './chunks/x83';
import x84 from './chunks/x84';
import x85 from './chunks/x85';
import x86 from './chunks/x86';
import x87 from './chunks/x87';
import x88 from './chunks/x88';
import x89 from './chunks/x89';
import x8a from './chunks/x8a';
import x8b from './chunks/x8b';
import x8c from './chunks/x8c';
import x8d from './chunks/x8d';
import x8e from './chunks/x8e';
import x8f from './chunks/x8f';
import x90 from './chunks/x90';
import x91 from './chunks/x91';
import x92 from './chunks/x92';
import x93 from './chunks/x93';
import x94 from './chunks/x94';
import x95 from './chunks/x95';
import x96 from './chunks/x96';
import x97 from './chunks/x97';
import x98 from './chunks/x98';
import x99 from './chunks/x99';
import x9a from './chunks/x9a';
import x9b from './chunks/x9b';
import x9c from './chunks/x9c';
import x9d from './chunks/x9d';
import x9e from './chunks/x9e';
import x9f from './chunks/x9f';
import xa0 from './chunks/xa0';
import xa1 from './chunks/xa1';
import xa2 from './chunks/xa2';
import xa3 from './chunks/xa3';
import xa4 from './chunks/xa4';
import xa7 from './chunks/xa7';
import xf9 from './chunks/xf9';
import xfa from './chunks/xfa';
import xfb from './chunks/xfb';
import xfe from './chunks/xfe';
import xff from './chunks/xff';

// Korean Hangul Jamo tables
const I = ['g','gg','n','d','dd','r','m','b','bb','s','ss','','j','jj','c','k','t','p','h'];
const M = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','weo','we','wi','yu','eu','yi','i'];
const F = ['','g','gg','gs','n','nj','nh','d','l','lg','lm','lb','ls','lt','lp','lh','m','b','bs','s','ss','ng','j','c','k','t','p','h'];

export interface Charmap {
  [key: string]: string;
}

// 2D array: _[high][low]
const _: (string | null)[][] = [];
_[0x00] = x00;
_[0x01] = x01;
_[0x02] = x02;
_[0x03] = x03;
_[0x04] = x04;
_[0x05] = x05;
_[0x06] = x06;
_[0x07] = x07;
_[0x09] = x09;
_[0x0a] = x0a;
_[0x0b] = x0b;
_[0x0c] = x0c;
_[0x0d] = x0d;
_[0x0e] = x0e;
_[0x0f] = x0f;
_[0x10] = x10;
_[0x11] = x11;
_[0x12] = x12;
_[0x13] = x13;
_[0x14] = x14;
_[0x15] = x15;
_[0x16] = x16;
_[0x17] = x17;
_[0x18] = x18;
_[0x1e] = x1e;
_[0x1f] = x1f;
_[0x20] = x20;
_[0x21] = x21;
_[0x25] = x25;
_[0x28] = x28;
_[0x30] = x30;
_[0x31] = x31;
_[0x32] = x32;
_[0x33] = x33;
_[0x4e] = x4e;
_[0x4f] = x4f;
_[0x50] = x50;
_[0x51] = x51;
_[0x52] = x52;
_[0x53] = x53;
_[0x54] = x54;
_[0x55] = x55;
_[0x56] = x56;
_[0x57] = x57;
_[0x58] = x58;
_[0x59] = x59;
_[0x5a] = x5a;
_[0x5b] = x5b;
_[0x5c] = x5c;
_[0x5d] = x5d;
_[0x5e] = x5e;
_[0x5f] = x5f;
_[0x60] = x60;
_[0x61] = x61;
_[0x62] = x62;
_[0x63] = x63;
_[0x64] = x64;
_[0x65] = x65;
_[0x66] = x66;
_[0x67] = x67;
_[0x68] = x68;
_[0x69] = x69;
_[0x6a] = x6a;
_[0x6b] = x6b;
_[0x6c] = x6c;
_[0x6d] = x6d;
_[0x6e] = x6e;
_[0x6f] = x6f;
_[0x70] = x70;
_[0x71] = x71;
_[0x72] = x72;
_[0x73] = x73;
_[0x74] = x74;
_[0x75] = x75;
_[0x76] = x76;
_[0x77] = x77;
_[0x78] = x78;
_[0x79] = x79;
_[0x7a] = x7a;
_[0x7b] = x7b;
_[0x7c] = x7c;
_[0x7d] = x7d;
_[0x7e] = x7e;
_[0x7f] = x7f;
_[0x80] = x80;
_[0x81] = x81;
_[0x82] = x82;
_[0x83] = x83;
_[0x84] = x84;
_[0x85] = x85;
_[0x86] = x86;
_[0x87] = x87;
_[0x88] = x88;
_[0x89] = x89;
_[0x8a] = x8a;
_[0x8b] = x8b;
_[0x8c] = x8c;
_[0x8d] = x8d;
_[0x8e] = x8e;
_[0x8f] = x8f;
_[0x90] = x90;
_[0x91] = x91;
_[0x92] = x92;
_[0x93] = x93;
_[0x94] = x94;
_[0x95] = x95;
_[0x96] = x96;
_[0x97] = x97;
_[0x98] = x98;
_[0x99] = x99;
_[0x9a] = x9a;
_[0x9b] = x9b;
_[0x9c] = x9c;
_[0x9d] = x9d;
_[0x9e] = x9e;
_[0x9f] = x9f;
_[0xa0] = xa0;
_[0xa1] = xa1;
_[0xa2] = xa2;
_[0xa3] = xa3;
_[0xa4] = xa4;
_[0xa7] = xa7;
_[0xf9] = xf9;
_[0xfa] = xfa;
_[0xfb] = xfb;
_[0xfe] = xfe;
_[0xff] = xff;

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
