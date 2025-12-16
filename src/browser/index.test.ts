// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { slugify, transliterate } from './index';

describe('browser/transliterate()', () => {
  it('should transliterate in browser environment', () => {
    expect(typeof window).not.toBe('undefined');
    expect(transliterate('你好')).toBe('Ni Hao');
    expect(transliterate('北亰')).toBe('Bei Jing');
  });

  it('should handle options', () => {
    expect(transliterate('你好，世界！', { ignore: ['！'] })).toBe(
      'Ni Hao,Shi Jie！'
    );
  });
});

describe('browser/slugify()', () => {
  it('should slugify in browser environment', () => {
    expect(typeof window).not.toBe('undefined');
    expect(slugify('你好, 世界!')).toBe('ni-hao-shi-jie');
  });

  it('should handle options', () => {
    expect(slugify('你好, 世界!', { separator: '_' })).toBe('ni_hao_shi_jie');
    expect(slugify('你好, 世界!', { uppercase: true })).toBe('NI-HAO-SHI-JIE');
  });
});
