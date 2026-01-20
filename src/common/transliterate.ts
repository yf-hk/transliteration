import { type Charmap, charmap } from '../../data/charmap';
import type {
  IntervalArray,
  OptionReplaceArray,
  OptionReplaceCombined,
  OptionReplaceObject,
  OptionsTransliterate,
} from '../types';

import {
  deepClone,
  escapeRegExp,
  findStrOccurrences,
  hasChinese,
  hasPunctuationOrSpace,
  inRange,
  regexpReplaceCustom,
} from './utils';

const SURROGATE_HIGH_REGEX = /[\uD800-\uDBFF]/;
const SURROGATE_LOW_REGEX = /[\uDC00-\uDFFF]/;
const REDOS_SAFE_REGEX = /[^\s\S]/;

export const defaultOptions: OptionsTransliterate = {
  ignore: [],
  replace: [],
  replaceAfter: [],
  trim: false,
  unknown: '',
  fixChineseSpacing: true,
};

export class Transliterate {
  get options(): OptionsTransliterate {
    return deepClone({ ...defaultOptions, ...this.confOptions });
  }

  protected confOptions: OptionsTransliterate;
  protected defaultMap: Charmap;
  protected map: Charmap;

  constructor(
    confOptions: OptionsTransliterate = deepClone(defaultOptions),
    map: Charmap = charmap
  ) {
    this.confOptions = confOptions;
    this.defaultMap = map;
    this.map = map;
  }

  /**
   * Set default config
   * @param options
   */
  config(options?: OptionsTransliterate, reset = false): OptionsTransliterate {
    if (reset) {
      this.confOptions = {};
    }
    if (options && typeof options === 'object') {
      this.confOptions = deepClone(options);
    }
    return this.confOptions;
  }

  /**
   * Replace the source string using the code map
   * @param str
   * @param ignoreRanges
   * @param unknown
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex algorithm for character mapping with Chinese spacing
  codeMapReplace(
    str: string,
    opt: OptionsTransliterate,
    ignoreRanges: IntervalArray = []
  ): string {
    let index = 0;
    let result = '';
    const strContainsChinese = opt.fixChineseSpacing && hasChinese(str);
    let lastCharHasChinese = false;
    for (let i = 0; i < str.length; i++) {
      // Get current character, taking surrogates in consideration
      const char =
        SURROGATE_HIGH_REGEX.test(str[i]) &&
        SURROGATE_LOW_REGEX.test(str[i + 1])
          ? str[i] + str[i + 1]
          : str[i];
      let s: string;
      let ignoreFixingChinese = false;
      // Check if current character is in ignored list or UTF-32 surrogate pair
      const isIgnored =
        inRange(index, ignoreRanges) ||
        (char.length === 2 && inRange(index + 1, ignoreRanges));

      if (isIgnored) {
        s = char;
        // if it's the first character of an ignored string, then leave ignoreFixingChinese to true
        if (
          !ignoreRanges.find((range) => range[1] >= index && range[0] === index)
        ) {
          ignoreFixingChinese = true;
        }
      } else {
        s = this.map[char] || opt.unknown || '';
      }
      // fix Chinese spacing issue
      if (strContainsChinese) {
        if (
          lastCharHasChinese &&
          !ignoreFixingChinese &&
          !hasPunctuationOrSpace(s)
        ) {
          s = ` ${s}`;
        }
        lastCharHasChinese = !!s && hasChinese(char);
      }
      result += s;
      index += char.length;
      // If it's UTF-32 then skip next character
      i += char.length - 1;
    }
    return result;
  }

  /**
   * Convert the object version of the 'replace' option into tuple array one
   * @param option replace option to be either an object or tuple array
   * @return return the paired array version of replace option
   */
  formatReplaceOption(option: OptionReplaceCombined): OptionReplaceArray {
    if (Array.isArray(option)) {
      // return a new copy of the array
      return deepClone(option);
    }
    // convert object option to array one
    const replaceArr: OptionReplaceArray = [];
    for (const key in option as OptionReplaceObject) {
      /* v8 ignore next 3 */
      if (Object.hasOwn(option, key)) {
        replaceArr.push([key, option[key]]);
      }
    }
    return replaceArr;
  }

  /**
   * Search and replace a list of strings(regexps) and return the result string
   * @param source Source string
   * @param searches Search-replace string(regexp) pairs
   */
  replaceString(
    source: string,
    searches: OptionReplaceArray,
    ignore: string[] = []
  ): string {
    const clonedSearches = deepClone(searches);
    let result = source;
    for (const item of clonedSearches) {
      switch (true) {
        case item[0] instanceof RegExp:
          item[0] = new RegExp(
            item[0].source,
            `${item[0].flags.replace('g', '')}g`
          );
          break;
        case typeof item[0] === 'string' && item[0].length > 0:
          item[0] = new RegExp(escapeRegExp(item[0]), 'g');
          break;
        default:
          item[0] = REDOS_SAFE_REGEX; // Prevent ReDos attack
      }
      result = regexpReplaceCustom(result, item[0], item[1], ignore);
    }
    return result;
  }

  /**
   * Set charmap data
   * @param {Charmap} [data]
   * @param {boolean} [reset=false]
   * @memberof Transliterate
   */
  setData(data?: Charmap, reset = false): Charmap {
    if (reset) {
      this.map = deepClone(this.defaultMap);
    }
    if (data && typeof data === 'object' && Object.keys(data).length) {
      this.map = deepClone(this.map);
      for (const from in data) {
        /* v8 ignore next 5 */
        if (
          Object.hasOwn(data, from) &&
          from.length < 3 &&
          from <= '\udbff\udfff'
        ) {
          this.map[from] = data[from];
        }
      }
    }
    return this.map;
  }

  /**
   * Main transliterate function
   * @param source The string which is being transliterated
   * @param options Options object
   */
  transliterate(source: string, options?: OptionsTransliterate): string {
    const opts = typeof options === 'object' ? options : {};
    const opt: OptionsTransliterate = deepClone({
      ...this.options,
      ...opts,
    });

    // force convert to string
    let str = typeof source === 'string' ? source : String(source);

    const replaceOption: OptionReplaceArray = this.formatReplaceOption(
      opt.replace as OptionReplaceCombined
    );
    if (replaceOption.length) {
      str = this.replaceString(str, replaceOption, opt.ignore);
    }

    // ignore
    const ignoreRanges: IntervalArray =
      opt.ignore && opt.ignore.length > 0
        ? findStrOccurrences(str, opt.ignore)
        : [];
    str = this.codeMapReplace(str, opt, ignoreRanges);

    // trim spaces at the beginning and ending of the string
    if (opt.trim) {
      str = str.trim();
    }

    const replaceAfterOption: OptionReplaceArray = this.formatReplaceOption(
      opt.replaceAfter as OptionReplaceCombined
    );
    if (replaceAfterOption.length) {
      str = this.replaceString(str, replaceAfterOption);
    }
    return str;
  }
}
