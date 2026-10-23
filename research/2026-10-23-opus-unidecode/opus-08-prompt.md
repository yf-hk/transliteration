We implemented and measured the final positive-only lazy page index you reviewed in round 07. Please give one last focused correctness/maintainability review of the EXACT selected implementation below. This is a local prototype being promoted to production with formatting and the already-measured ASCII classification shortcut; do not suggest new architectures or experiments. Identify concrete bugs, or state no blocker. Tools are disabled. Output <= 900 words.

Constraints: published transliteration 2.6.2 API and live config/setData map behavior must be preserved; no runtime dependency; browser/CDN paths unchanged. Slots contain STRINGS, including empty string, not numeric offsets. Full code points select page = code >>> 8 and slot = code & 255. Pages are allocated only for real own string values, have null prototypes, and cache no absences. Original built-in maps alone are registered; all 128 ASCII mappings are checked once. Exported class/defaultOptions/registerDefaultMap are internal source exports, not package API; archive inspection confirmed no raw charmap module shipped. setData returns expose the map; exposure is monotonic across API sharers. Generic custom maps retain the live lookup behavior.

New defect found while testing: even before this index, the prior private-map native fallback let an inherited getter receive the original map as this without marking it exposed. That getter could retain/mutate it, invalidating ASCII shortcut and cached values. The code below fixes ALL generic paths (Han, ignore, object unknown) with readMap: descriptor-proven own strings are safe; unresolved present keys mark exposed BEFORE reading/getter execution. Each later helper invocation rechecks shared ownership. The speculative loop restarts generic mapping before invoking any user getter, so no getter is run twice. Receiver-leak tests compare to published 2.6.2 because the frozen optimized baseline is already incorrect.

Evidence: 271,112 fresh full/Latin differential comparisons passed, 10 prototype/accessor adversarial scenarios passed, 12 published-reference receiver-leak scenarios passed including reentry, retained mutation, pre-cached values, Han/ignore/non-string unknown and own accessors installed pre-import. Post-load monkeypatch tests for captured getOwnPropertyDescriptor/hasOwn/setPrototypeOf passed. Warm 5-round exploratory Korean 896.5k/s vs previous 303.7k and Unidecode 485.4k, all 8/8 exact outputs and disjoint observed ranges; Latin 1336.4k vs previous 697.1k and Unidecode1128.1k with overlap vs Unidecode. Cyrillic612.9k vs209.8k, but differing outputs vs Unidecode. 15-round final and full peer matrix still to run.

Cold/resource: Korean first-call1.227ms vs0.956ms baseline (+0.271ms, overlapping ranges), representative64-string cold corpus9.17ms vs7.58ms (overlap). Representative retained heap adds212KiB incl80page IDs (Han included). Worst-case11,172 distinct Hangul chars first-call10.83ms vs4.45ms, retained heap+405KiB; this cost will be disclosed. Gzip before final cleanup+345Bfull/+373BLatin. No global fastest or universal memory/cold limit claim.

Review specifically stale-map/reentrant/getter behavior, surrogates and missing/empty mappings, generic coercion order, excessive complexity. Distinguish actionable regressions from intrinsic monkeypatch behaviors already present in baseline. No tests need be run by you; review supplied source/evidence.

```ts
import type { Charmap } from '../../data/charmap';
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
  regexpReplaceCustom,
} from './utils';

const REDOS_SAFE_REGEX = /[^\s\S]/;
const NON_ASCII_REGEX = /[^\p{ASCII}]/gu;
const LATIN_REGEX = /^\p{Script_Extensions=Latin}$/u;
const NUMBER_REGEX = /^\p{Number}$/u;
// A map returned by either API can be changed through its shared reference.
type Page = (string | undefined)[];
type PrivateMap = { pages: Record<number, Page | undefined> | undefined };
const mapAccess = new WeakMap<Charmap, PrivateMap | 'exposed'>();
const setPagePrototype = Object.setPrototypeOf;
const getOwnDescriptor = Object.getOwnPropertyDescriptor;
const hasOwnValue = Object.hasOwn;

function privateValue(map: Charmap, state: PrivateMap, code: number): string | undefined {
  const high = code >>> 8;
  const low = code & 255;
  const directory = state.pages;
  let page = directory?.[high];
  const cached = page?.[low];
  if (cached !== undefined) return cached;
  const own = getOwnDescriptor(map, String.fromCodePoint(code));
  if (!own || !hasOwnValue(own, 'value') || typeof own.value !== 'string') return undefined;
  if (page === undefined) {
    page = [];
    setPagePrototype(page, null);
    const pages = directory ?? (state.pages = Object.create(null));
    pages[high] = page;
  }
  page[low] = own.value;
  return own.value;
}

function readMap(map: Charmap, char: string): string | undefined {
  const state = mapAccess.get(map);
  if (state && state !== 'exposed') {
    const code = char.codePointAt(0);
    if (code === undefined) return undefined;
    const value = privateValue(map, state, code);
    if (value !== undefined) return value;
    if (!(char in map)) return undefined;
    // A getter receives the map as its receiver and can retain or mutate it.
    mapAccess.set(map, 'exposed');
  }
  return map[char];
}

export function registerDefaultMap(map: Charmap): void {
  if (mapAccess.has(map)) return;
  for (let code = 0; code < 128; code++) {
    const char = String.fromCharCode(code);
    const entry = Object.getOwnPropertyDescriptor(map, char);
    if (!entry || !Object.hasOwn(entry, 'value') || entry.value !== char) {
      mapAccess.set(map, 'exposed');
      return;
    }
  }
  mapAccess.set(map, { pages: undefined });
}

export const defaultOptions: OptionsTransliterate = {
  ignore: [],
  replace: [],
  replaceAfter: [],
  trim: false,
  unknown: '',
  fixChineseSpacing: true,
};

export class Transliterate {
  protected confOptions: OptionsTransliterate;
  protected defaultMap: Charmap;
  protected map: Charmap;

  constructor(confOptions: OptionsTransliterate, map: Charmap) {
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
    let ignoreIndex = 0;
    let result = '';
    const strContainsChinese = opt.fixChineseSpacing && hasChinese(str);
    if (!strContainsChinese && ignoreRanges.length === 0) {
      const unknown = opt.unknown ?? '';
      const state = mapAccess.get(this.map);
      if (state && state !== 'exposed' && typeof unknown === 'string') {
        let inheritedCharacter = false;
        let start = 0;
        for (let i = 0; i < str.length; i++) {
          let code = str.charCodeAt(i);
          if (code < 128) continue;
          let width = 1;
          if (code >= 0xd800 && code <= 0xdbff) {
            const low = str.charCodeAt(i + 1);
            if (low >= 0xdc00 && low <= 0xdfff) {
              code = (code - 0xd800) * 1024 + low - 0xdc00 + 0x10000;
              width = 2;
            }
          }
          let value = privateValue(this.map, state, code);
          if (value === undefined) {
            const char = str.slice(i, i + width);
            if (char in this.map) { mapAccess.set(this.map, 'exposed'); inheritedCharacter = true; break; }
            value = unknown;
          }
          result += str.slice(start, i) + value;
          start = i + width;
          i += width - 1;
        }
        if (!inheritedCharacter) return start ? result + str.slice(start) : str;
        result = '';
      }

      const usePrivateMapping = typeof mapAccess.get(this.map) === 'object';
      let unchangedStart = 0;
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        const low = str.charCodeAt(i + 1);
        const char =
          code >= 0xd800 && code <= 0xdbff && low >= 0xdc00 && low <= 0xdfff
            ? str[i] + str[i + 1]
            : str[i];
        const mapped = (usePrivateMapping ? readMap(this.map, char) : this.map[char]) ?? opt.unknown ?? '';
        if (mapped !== char) {
          result += str.slice(unchangedStart, i) + mapped;
          unchangedStart = i + char.length;
        }
        i += char.length - 1;
      }
      return unchangedStart ? result + str.slice(unchangedStart) : str;
    }
    const usePrivateMapping = typeof mapAccess.get(this.map) === 'object';
    let lastCharHasChinese = false;
    let lastCharIsLatin = false;
    let lastCharIsNumber = false;
    let lastOutputChar = '';
    for (let i = 0; i < str.length; i++) {
      // Get current character, taking surrogates in consideration
      const code = str.charCodeAt(i);
      const low = str.charCodeAt(i + 1);
      const char =
        code >= 0xd800 && code <= 0xdbff && low >= 0xdc00 && low <= 0xdfff
          ? str[i] + str[i + 1]
          : str[i];
      let s: string;
      let ignoreFixingChinese = false;
      // Check if current character is in ignored list or UTF-32 surrogate pair
      while (
        ignoreIndex < ignoreRanges.length &&
        ignoreRanges[ignoreIndex][1] < i
      ) {
        ignoreIndex += 1;
      }
      const ignoreRange = ignoreRanges[ignoreIndex];
      const isIgnored = ignoreRange && ignoreRange[0] < i + char.length;

      if (isIgnored) {
        s = char;
        // if it's the first character of an ignored string, then leave ignoreFixingChinese to true
        ignoreFixingChinese = ignoreRange[0] !== i;
      } else {
        s = (usePrivateMapping ? readMap(this.map, char) : this.map[char]) ?? opt.unknown ?? '';
      }
      // fix Chinese spacing issue
      if (strContainsChinese && s) {
        const basicHan = code >= 0x4e00 && code <= 0x9ffc;
        const charHasChinese = basicHan || hasChinese(char);
        const charIsNumber = !basicHan && NUMBER_REGEX.test(char);
        const charIsLatin = !basicHan && LATIN_REGEX.test(char);
        if (
          !(
            ignoreFixingChinese ||
            hasPunctuationOrSpace(s) ||
            hasPunctuationOrSpace(lastOutputChar)
          ) &&
          (lastCharHasChinese ||
            (charHasChinese && (lastCharIsLatin || lastCharIsNumber)) ||
            (charIsNumber && lastCharIsLatin) ||
            (charIsLatin && lastCharIsNumber))
        ) {
          s = ` ${s}`;
        }
        lastCharHasChinese = charHasChinese;
        lastCharIsLatin = charIsLatin;
        lastCharIsNumber = charIsNumber;
        lastOutputChar = s.slice(-1);
      }
      result += s;
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
      for (const from of Object.keys(data)) {
        const code = from.codePointAt(0);
        if (code !== undefined && from.length === (code > 0xff_ff ? 2 : 1)) {
          this.map[from] = data[from];
        }
      }
    }
    mapAccess.set(this.map, 'exposed');
    return this.map;
  }

  /**
   * Main transliterate function
   * @param source The string which is being transliterated
   * @param options Options object
   */
  transliterate(source: string, options?: OptionsTransliterate): string {
    if (
      options === undefined &&
      Reflect.ownKeys(this.confOptions).length === 0
    ) {
      if (
        typeof source === 'string' &&
        typeof mapAccess.get(this.map) === 'object' &&
        source.search(NON_ASCII_REGEX) === -1
      ) {
        return source;
      }
      return this.transliterateWithOptions(source, defaultOptions);
    }
    const opts = typeof options === 'object' ? options : {};
    const opt: OptionsTransliterate = deepClone({
      ...defaultOptions,
      ...this.confOptions,
      ...opts,
    });

    return this.transliterateWithOptions(source, opt);
  }

  protected transliterateWithOptions(
    source: string,
    opt: OptionsTransliterate
  ): string {
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

```
