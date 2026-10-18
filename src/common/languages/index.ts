import { bulgarian } from './cyrillic/bulgarian';
import type { LanguageRules } from './types';

/**
 * Registry of supported languages, keyed by ISO 639-1 code.
 * To add a language, create its rules file and register it here.
 */
const languages = {
  bg: bulgarian,
} satisfies Record<string, LanguageRules>;

export type Language = keyof typeof languages;

export function getLanguageRules(
  language?: Language
): LanguageRules | undefined {
  return language ? languages[language] : undefined;
}
