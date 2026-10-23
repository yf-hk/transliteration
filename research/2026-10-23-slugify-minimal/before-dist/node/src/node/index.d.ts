interface Charmap {
  [key: string]: string;
}
type OptionReplaceArrayItem = [string | RegExp, string];
type OptionReplaceArray = OptionReplaceArrayItem[];
type OptionReplaceObject = {
  [from: string]: string;
};
type OptionReplaceCombined = OptionReplaceArray | OptionReplaceObject;
type OptionsTransliterate = {
  /**
   * Ignore a list of strings untouched
   * @example tr('你好，世界', { ignore: ['你'] }) // 你 Hao , Shi Jie
   */
  ignore?: string[];
  /**
   * Replace a list of string / regex in the source string into the provided target string before transliteration
   * The option can either be an array or an object
   * @example tr('你好，世界', { replace: {你: 'You'} }) // You Hao , Shi Jie
   * @example tr('你好，世界', { replace: [['你', 'You']] }) // You Hao , Shi Jie
   * @example tr('你好，世界', { replace: [[/你/g, 'You']] }) // You Hao , Shi Jie
   */
  replace?: OptionReplaceCombined;
  /**
   * Same as `replace` but after transliteration
   */
  replaceAfter?: OptionReplaceCombined;
  /**
   * Decides whether or not to trim the result string after transliteration
   * @default false
   */
  trim?: boolean;
  /**
   * Characters without a mapping are replaced by `unknown`; explicit empty mappings stay silent.
   * @default ''
   */
  unknown?: string;
  /**
   * In Chinese-containing text, separate Chinese characters and Latin/number runs.
   * For example, `hello世界02` becomes `hello Shi Jie 02`.
   * Set to false to preserve compact output and skip Chinese spacing processing.
   * @default true
   */
  fixChineseSpacing?: boolean;
};
type OptionsSlugify = OptionsTransliterate & {
  /**
   * Whether the result need to be converted into lowercase
   * @default true
   */
  lowercase?: boolean;
  /**
   * Whether the result need to be converted into uppercase
   * @default false
   */
  uppercase?: boolean;
  /**
   * Custom separator string
   * @default '-'
   */
  separator?: string;
  /**
   * Allowed characters.
   * When `allowedChars` is set to `'abc'`, then only characters match `/[abc]/g` will be preserved.
   * Other characters will all be converted to `separator`
   * @default 'a-zA-Z0-9-_.~''
   */
  allowedChars?: string;
  /**
   * Separate Chinese characters and Latin/number runs in Chinese-containing text.
   */
  fixChineseSpacing?: boolean;
};
type TransliterationFunction<T> = {
  (source: string, options?: T): string;
  /**
   * Set default config
   * @param options
   * @param reset
   */
  config: (options?: T, reset?: boolean) => T;
  /**
   * Set charmap data
   * @param data
   * @param reset
   * @memberof Transliterate
   */
  setData: (data?: Charmap, reset?: boolean) => Charmap;
  /**
   * Used by browser
   */
  noConflict?: () => TransliterationFunction<T>;
};
type TransliterateFunction = TransliterationFunction<OptionsTransliterate>;
type SlugifyFunction = TransliterationFunction<OptionsSlugify>;
export declare const transliterate: TransliterateFunction;
export declare const slugify: SlugifyFunction;
export {};