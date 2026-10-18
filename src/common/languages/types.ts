/**
 * Language-specific rules applied on top of the default charmap.
 */
export type LanguageRules = {
  /**
   * Per-character overrides of the default charmap
   */
  map?: Readonly<Record<string, string>>;
  /**
   * Context-sensitive overrides, called for the character at index `i` of `str`.
   * Return `null` to fall back to `map` and the default charmap.
   */
  resolve?: (str: string, i: number) => string | null;
};
