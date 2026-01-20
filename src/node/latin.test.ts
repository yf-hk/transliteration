import { describe, expect, it } from 'vitest';
import {
  slugify as browserLatinSlugify,
  transl as browserLatinTransl,
  transliterate as browserLatinTransliterate,
} from '../browser/latin';
import {
  slugify as latinSlugify,
  transliterate as latinTransliterate,
} from './latin';

describe('latin build', () => {
  it('transliterates Latin characters', () => {
    expect(latinTransliterate('S\u00e3o Paulo')).toBe('Sao Paulo');
  });

  it('omits non-Latin characters', () => {
    expect(latinTransliterate('\u4f60\u597d')).toBe('');
  });

  it('slugifies Latin-only strings', () => {
    expect(latinSlugify('S\u00e3o Paulo')).toBe('sao-paulo');
  });
});

describe('browser latin exports', () => {
  it('exposes transl alias', () => {
    expect(browserLatinTransl).toBe(browserLatinTransliterate);
  });

  it('slugifies via browser build', () => {
    expect(browserLatinSlugify('S\u00e3o Paulo')).toBe('sao-paulo');
  });
});
