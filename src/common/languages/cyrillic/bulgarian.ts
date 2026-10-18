import type { LanguageRules } from '../types';

const LETTER_REGEX = /\p{L}/u;

/**
 * Bulgarian: Streamlined System (Law on the Transliteration, State Gazette 19/2009)
 * @see https://lex.bg/laws/ldoc/2135623187
 */
export const bulgarian: LanguageRules = {
  map: {
    Ц: 'Ts',
    ц: 'ts',
    Щ: 'Sht',
    щ: 'sht',
    Ъ: 'A',
    ъ: 'a',
    Ь: 'Y',
    ь: 'y',
  },
  // `ия` at the end of a word is `ia`
  resolve(str, i) {
    const char = str[i];
    const prev = str[i - 1];
    if ((char !== 'я' && char !== 'Я') || (prev !== 'и' && prev !== 'И')) {
      return null;
    }
    const next = str.codePointAt(i + 1);
    if (next !== undefined && LETTER_REGEX.test(String.fromCodePoint(next))) {
      return null;
    }
    return char === 'Я' ? 'A' : 'a';
  },
};
