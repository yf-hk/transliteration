/**
 * Language-specific overrides applied on top of the default charmap.
 *
 * The default charmap is language-agnostic and Cyrillic is mapped as Russian
 * (e.g. `Щ` -> `Shch`), which differs from the Bulgarian official system.
 */

export type Language = 'bg';

/**
 * Bulgarian: Streamlined System (Law on the Transliteration, State Gazette 19/2009)
 * @see https://lex.bg/laws/ldoc/2135623187
 */
const BULGARIAN: Readonly<Record<string, string>> = {
  Ц: 'Ts',
  ц: 'ts',
  Щ: 'Sht',
  щ: 'sht',
  Ъ: 'A',
  ъ: 'a',
  Ь: 'Y',
  ь: 'y',
};

const LANGUAGE_MAPS: Readonly<
  Record<Language, Readonly<Record<string, string>>>
> = {
  bg: BULGARIAN,
};

const LETTER_REGEX = /\p{L}/u;

/**
 * Get the character overrides of a language
 */
export function getLanguageMap(
  language?: Language
): Readonly<Record<string, string>> | undefined {
  return language ? LANGUAGE_MAPS[language] : undefined;
}

/**
 * Context-sensitive rule: Bulgarian `ия` at the end of a word is `ia`.
 * Returns the replacement for the character at index `i` if it is such a `я`/`Я`.
 */
export function bulgarianWordFinalYa(str: string, i: number): string | null {
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
}
