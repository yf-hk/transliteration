You are Claude Opus 5.5, consulted directly at the user's explicit request. Read-only design discussion; tools disabled. Be concrete and critical. Goal: beat Unidecode JS on non-ASCII transliteration while preserving EVERY packaged API behavior, zero runtime dependencies, jsDelivr formats, small gzip size and low memory. User also sees Rust deunicode winning; distinguish it from npm Unidecode and don't promise JavaScript universally beats native Rust.
Current actual Node26.5 five-round medians k complete strings/s, ours vs Unidecode1.1.0: ASCII4505/2770, Latin821/1124, Cyrillic236/260, Chinese307/573, Japanese353/676, Korean362/494,mixed189/433,long3.219/8.3. Release2.6.2 mixed206.6/long4.272; current slower there,7/8 exact outputs. All ASCII/Latin matched8/8. Chinese etc conventions differ; benchmark fixtures/probes attached. Rust deunicode9.205M ASCII2.463M Chinese, native optimized release. Need causal source hypotheses, not just benchmark claims.
Current fastpaths: known-default options reuse, primitive ASCII direct return, native /nonASCII/gu replace for private generated maps WITHOUT Han or ignores, absent unknown keys handled natively, exposed/custom maps generic numeric UTF16 loop. Private/exposed WeakMap shared between APIs ensures live returned map identity. Any setData call exposes map; updates clone FIRST so reentrancy or a throwing getter cannot leave a mutated map eligible. Registration only built-in maps, validates all ASCII OWN data descriptors identity without getters; exposed never becomes private again. Native callbacks only use OWN entries; inherited entries cause generic fallback BEFORE getters are invoked to preserve reentrant mutation of later ASCII/map state. Unknown non-string/coercion stays generic. Options snapshot timing, replace/ignore ordering, literal $, surrogate pairs/lone surrogates, global config mutations/symbol getters all observable. Existing exhaustive before/after acceptance covered1.248M comparisons + API/package checks; must retain that safety.
Please: (1) explain likely dominant remaining costs from code, distinguishing evidence/hypothesis; (2) propose 2-3 bounded concrete candidates in priority order, with pseudocode/patch shape and expected constraints; (3) challenge unsafe shortcuts, especially inherited getters, shared maps and Chinese spacing/deleted chars; (4) decide whether numeric/page lookup or full native rewrite is warranted vs smaller hot-loop changes; (5) give acceptance criteria. Performance is primary, but avoid result caching/tuned-to-8-fixtures tricks/bloat. Respond <=1600 words. Sol6.1 is independently profiling; we will send measured findings and then final candidate back for discussion.


FILE src/common/transliterate.ts
```typescript
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
const mapAccess = new WeakMap<Charmap, 'private' | 'exposed'>();

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
  mapAccess.set(map, 'private');
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
      if (
        mapAccess.get(this.map) === 'private' &&
        typeof unknown === 'string'
      ) {
        let unknownCharacter = false;
        const mapped = str.replace(NON_ASCII_REGEX, (char) => {
          if (Object.hasOwn(this.map, char)) return this.map[char];
          if (!(char in this.map)) return unknown;
          // Inherited getters can expose and change later map entries.
          unknownCharacter = true;
          return char;
        });
        if (!unknownCharacter) return mapped;
      }

      let unchangedStart = 0;
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        const low = str.charCodeAt(i + 1);
        const char =
          code >= 0xd800 && code <= 0xdbff && low >= 0xdc00 && low <= 0xdfff
            ? str[i] + str[i + 1]
            : str[i];
        const mapped = this.map[char] ?? opt.unknown ?? '';
        if (mapped !== char) {
          result += str.slice(unchangedStart, i) + mapped;
          unchangedStart = i + char.length;
        }
        i += char.length - 1;
      }
      return unchangedStart ? result + str.slice(unchangedStart) : str;
    }
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
        s = this.map[char] ?? opt.unknown ?? '';
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
        mapAccess.get(this.map) === 'private' &&
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


FILE src/common/slugify.ts
```typescript
import type { OptionsSlugify } from '../types';
import {
  defaultOptions as defaultOptionsTransliterate,
  Transliterate,
} from './transliterate';
import { deepClone, escapeRegExp, regexpReplaceCustom } from './utils';

const DEFAULT_ALLOWED_CHARS = 'a-zA-Z0-9-_.~';
const DEFAULT_SEPARATORS = /[^a-zA-Z0-9_.~]+/g;
const DEFAULT_EDGES = /^-+|-+$/g;

// Slugify
export const defaultOptions: OptionsSlugify = {
  ...deepClone(defaultOptionsTransliterate),
  allowedChars: DEFAULT_ALLOWED_CHARS,
  lowercase: true,
  separator: '-',
  uppercase: false,
  fixChineseSpacing: true,
};

export class Slugify extends Transliterate {
  /**
   * Set default config
   * @param options
   */
  config(options?: OptionsSlugify, reset = false): OptionsSlugify {
    if (reset) {
      this.confOptions = {};
    }
    if (options && typeof options === 'object') {
      this.confOptions = deepClone(options);
    }
    return this.confOptions;
  }

  /**
   * Slugify
   * @param str
   * @param options
   */
  slugify(str: string, options?: OptionsSlugify): string {
    const opts = typeof options === 'object' ? options : {};
    const opt: OptionsSlugify =
      options === undefined && Reflect.ownKeys(this.confOptions).length === 0
        ? defaultOptions
        : deepClone({
            ...defaultOptions,
            ...this.confOptions,
            ...opts,
          });

    const allowedChars = opt.allowedChars ?? defaultOptions.allowedChars;
    const defaultCleanup =
      opt.separator === '-' &&
      allowedChars === DEFAULT_ALLOWED_CHARS &&
      Array.isArray(opt.ignore) &&
      opt.ignore.length === 0;
    const sep =
      !defaultCleanup && opt.separator ? escapeRegExp(opt.separator) : '';

    let slug: string = this.transliterateWithOptions(str, opt);

    if (defaultCleanup) {
      slug = slug.replace(DEFAULT_SEPARATORS, '-').replace(DEFAULT_EDGES, '');
    } else {
      slug = regexpReplaceCustom(
        slug,
        new RegExp(`[^${allowedChars}]+`, 'g'),
        opt.separator ?? '-',
        opt.ignore ?? []
      );
      if (sep) {
        slug = slug.replace(
          new RegExp(`(?:${sep})+`, 'g'),
          () => opt.separator ?? '-'
        );
        slug = slug.replace(new RegExp(`^(?:${sep})+|(?:${sep})+$`, 'g'), '');
      }
    }

    if (opt.lowercase) {
      slug = slug.toLowerCase();
    }
    if (opt.uppercase) {
      slug = slug.toUpperCase();
    }
    return slug;
  }
}

```


FILE src/common/utils.ts
```typescript
import type { IntervalArray } from '../types';

const ESCAPE_REGEXP = /[-[\]/{}()*+?.\\^$|]/g;
const CHINESE_REGEX =
  /[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DBF\u4E00-\u9FFC\uF900-\uFA6D\uFA70-\uFAD9]|\uD81B[\uDFF0\uDFF1]|[\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD869[\uDC00-\uDEDD\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A]/;
const PUNCTUATION_REGEX =
  /[\s!-#%-*,-/:;?@[-\]_{}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDFFF]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/;

const Position = {
  Left: -1,
  Middle: 0,
  Right: 1,
} as const;

type PositionType = (typeof Position)[keyof typeof Position];

/**
 * Escape regular expression string
 * @see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex/6969486#6969486
 */
export function escapeRegExp(str?: string): string {
  return (str || '').replace(ESCAPE_REGEXP, '\\$&');
}

/**
 * Check if a character is Chinese
 */
export function hasChinese(char: string): boolean {
  return CHINESE_REGEX.test(char);
}

/**
 * Check if a character is a punctuation
 */
export function hasPunctuationOrSpace(char: string): boolean {
  return PUNCTUATION_REGEX.test(char);
}

/**
 * Deep clone a variable
 * @param obj Object to clone
 * @returns The cloned object
 */
export function deepClone<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }
  if (obj instanceof Date) {
    return new Date(obj.valueOf()) as T;
  }
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      /* v8 ignore next 3 */
      if (Object.hasOwn(obj, key)) {
        const value = deepClone(obj[key]);
        if (key === '__proto__') {
          Object.defineProperty(clonedObj, key, {
            value,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        } else {
          clonedObj[key] = value;
        }
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Find all occurrences of a list of strings and merge the result in an interval array
 * @see: https://stackoverflow.com/questions/26390938/merge-arrays-with-overlapping-values#answer-26391774
 * @param source Source string
 * @param searches Strings to search
 * @returns A list of occurrences in the format of [[from, to], [from, to]]
 */
export function findStrOccurrences(
  source: string,
  searches: string[]
): IntervalArray {
  let result: IntervalArray = [];
  for (const str of searches) {
    if (str.length === 0) {
      continue;
    }
    let index = source.indexOf(str);
    while (index > -1) {
      result.push([index, index + str.length - 1]);
      index = source.indexOf(str, index + 1);
    }
  }
  // sort the interval array
  const sortedResult: IntervalArray = result.sort(
    (a, b) => a[0] - b[0] || a[1] - b[1]
  );
  result = [];
  let last: [number, number] | undefined;
  // merge overlapped ranges
  for (const r of sortedResult) {
    if (!last || r[0] > last[1] + 1) {
      last = r;
      result.push(last);
    } else if (r[1] > last[1]) {
      last[1] = r[1];
    }
  }
  return result;
}

/**
 * Check the position of the number of a specific range
 * @param num
 * @param range
 */
function getPosition(num: number, range: [number, number]): PositionType {
  if (num < range[0]) {
    return Position.Left;
  }
  if (num > range[1]) {
    return Position.Right;
  }
  return Position.Middle;
}

/**
 * Check if the given `num` is in the `rangeArr` interval array using Binary Search algorithm
 * Optimized iterative version to avoid recursion overhead and array slicing
 * @param num
 * @param rangeArr
 */
export function inRange(num: number, rangeArr: IntervalArray): boolean {
  if (rangeArr.length === 0) {
    return false;
  }

  let left = 0;
  let right = rangeArr.length - 1;

  while (left <= right) {
    const mid = (left + right) >>> 1;
    const pos = getPosition(num, rangeArr[mid]);

    if (pos === Position.Middle) {
      return true;
    }
    if (pos === Position.Left) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return false;
}

/**
 * Custom RegExp replace function to replace all unnecessary strings into target replacement string
 * @param source Source string
 * @param regexp Used to search through the source string
 * @param replacement Replace matched RegExp with replacement value
 * @param ignored Preserve these strings wherever they occur in the source
 */
export function regexpReplaceCustom(
  source: string,
  regexp: RegExp,
  replacement: string,
  ignored: string[] = []
): string {
  const ignoreRanges = findStrOccurrences(source, ignored);
  const rule = new RegExp(regexp.source, `${regexp.flags.replace('g', '')}g`);
  if (ignoreRanges.length === 0) {
    return source.replace(rule, () => replacement);
  }
  let result = '';
  let lastIndex = 0;
  let ignoreIndex = 0;
  for (const match of source.matchAll(rule)) {
    const start = match.index;
    const end = start + match[0].length;
    result += source.slice(lastIndex, start);
    while (
      ignoreIndex < ignoreRanges.length &&
      ignoreRanges[ignoreIndex][1] < start
    ) {
      ignoreIndex += 1;
    }
    let cursor = start;
    for (
      let i = ignoreIndex;
      i < ignoreRanges.length && ignoreRanges[i][0] < end;
      i += 1
    ) {
      const [ignoredStart, ignoredEnd] = ignoreRanges[i];
      const preservedStart = Math.max(start, ignoredStart);
      const preservedEnd = Math.min(end, ignoredEnd + 1);
      if (cursor < preservedStart) {
        result += replacement;
      }
      result += source.slice(preservedStart, preservedEnd);
      cursor = preservedEnd;
    }
    if (cursor < end || (start === end && !inRange(start, ignoreRanges))) {
      result += replacement;
    }
    lastIndex = end;
  }
  return result + source.slice(lastIndex);
}

```


FILE src/types/index.ts
```typescript
import type { Charmap } from '../../data/charmap';

export type OptionReplaceArrayItem = [string | RegExp, string];
export type OptionReplaceArray = OptionReplaceArrayItem[];
export type OptionReplaceObject = {
  [from: string]: string;
};
export type OptionReplaceCombined = OptionReplaceArray | OptionReplaceObject;

export type OptionsTransliterate = {
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

export type OptionsSlugify = OptionsTransliterate & {
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

export type Options = OptionsTransliterate | OptionsSlugify;

export type IntervalArray = [number, number][];

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

export type TransliterateFunction =
  TransliterationFunction<OptionsTransliterate>;

export type SlugifyFunction = TransliterationFunction<OptionsSlugify>;

export type BrowserGlobalObject = {
  transl: TransliterateFunction;
  transliterate: TransliterateFunction;
  slugify: SlugifyFunction;
};

```


FILE benchmark/src/fixtures.ts
```typescript
import type {
  Converter,
  Fallback,
  Fixture,
  Probe,
  ProbeResult,
} from './types.js';

const ascii = [
  'A practical guide to building reliable software',
  'Release notes for the next production deployment',
  'Customers orders invoices and payments',
  'What happens when the application restarts',
  'Simple text with numbers 12345 and punctuation!',
  'How to make small packages load quickly',
  'A product title for a modern online store',
  'Search indexing and URL generation for websites',
];
const latin = [
  'Crème brûlée et café à Montréal',
  'São Paulo e coração brasileiro',
  'École française à Québec',
  'España Málaga y Córdoba',
  'Dvořák Český Krumlov a příběh',
  'À bientôt très chère amie',
  'Hôtel élégant près du marché',
  'Smörgåsbord Straße Göteborg',
];
const cyrillic = [
  'Привет мир Москва и Санкт Петербург',
  'Новая статья о разработке программ',
  'Добро пожаловать на наш сайт',
  'България София и български език',
  'Україна Київ та українська мова',
  'Србија Београд и српски језик',
  'Поиск информации и создание адресов',
  'Проверка качества обработки текста',
];
const chinese = [
  '你好世界北京上海广州深圳',
  '2022年中文01英文nihao02',
  '如何构建快速可靠的软件系统',
  '这是一个包含中文的产品标题',
  'hello世界与数字123相遇',
  '欢迎来到我们的在线商店',
  '数据结构算法和性能优化',
  '中华人民共和国和繁體中文測試',
];
const japanese = [
  'こんにちは世界',
  '東京の朝と新しい記事',
  '大阪から京都への旅',
  'ひらがなとカタカナ',
  '日本語の商品タイトル',
  '新しいソフトウェアの開発',
  '日本の文化と暮らし',
  '東京2026とhello世界',
];
const korean = [
  '안녕하세요 세계 대한민국 서울',
  '한국어 문자를 영문으로 변환합니다',
  '빠르고 안정적인 소프트웨어 개발',
  '상품 제목과 검색 주소를 만들기',
  '부산 대구 인천 광주 대전 울산',
  '메모리 사용량과 실행 속도 측정',
  '오늘의 새로운 기사와 소식',
  '컴퓨터 프로그램 데이터 처리',
];
const mixed = [
  'Café 北京 Tokyo 서울 Москва مرحبا',
  'こんにちは世界 เชียงใหม่ வணக்கம்',
  'Rust Python JavaScript 中文 한국어',
  'مرحبا بالعالم שלום עולם',
  'கன்னியாகுமரி สวัสดีเชียงใหม่',
  '2026年 nouvelles Überstraße ① ẞ',
  'Emoji 🚀 and supplementary 𠮷 text',
  'Mixed scripts Ελληνικά العربية ไทย',
];

// These small probes expose dropped/retained/fallback output. They are not a
// pronunciation corpus or proof that every character in a fixture is supported.
export const probes: Record<string, Probe> = {
  latin: { input: 'Crème brûlée São Paulo', readings: ['cremebruleesaopaulo'] },
  cyrillic: { input: 'Привет мир', readings: ['privetmir'] },
  chinese: { input: '你好世界', readings: ['nihaoshijie'], cjk: true },
  japanese: {
    input: '東京へ行く',
    readings: ['tokyoheiku', 'toukyouheiku', 'tokyoeiku', 'toukyoueiku'],
    cjk: true,
  },
  korean: { input: '안녕하세요', readings: ['annyeonghaseyo'], cjk: true },
  arabic: { input: 'مرحبا بالعالم' },
  thai: { input: 'เชียงใหม่' },
  tamil: { input: 'கன்னியாகுமரி' },
  supplementary: { input: '𠮷𠬠' },
};

const mixedProbes = [
  'latin',
  'cyrillic',
  'chinese',
  'japanese',
  'korean',
  'arabic',
  'thai',
  'tamil',
  'supplementary',
];
export const fixtures: Fixture[] = [
  { id: 'ascii', texts: ascii, probes: [] },
  { id: 'latin', texts: latin, probes: ['latin'] },
  { id: 'cyrillic', texts: cyrillic, probes: ['cyrillic'] },
  { id: 'chinese', texts: chinese, probes: ['chinese'] },
  { id: 'japanese', texts: japanese, probes: ['japanese'] },
  { id: 'korean', texts: korean, probes: ['korean'] },
  { id: 'mixed', texts: mixed, probes: mixedProbes },
  {
    id: 'long',
    texts: mixed.map((text) => `${text} `.repeat(64)),
    probes: mixedProbes,
  },
];

export function inspectOutput(
  input: string,
  output: string,
  isFallback?: Fallback
): string[] {
  const flags: string[] = [];
  if (output.trim() === '') flags.push('dropped');
  if (/[^\p{ASCII}]/u.test(output)) flags.push('retained-unicode');
  if (/\[\?\]/u.test(output)) flags.push('placeholder');
  if (isFallback?.(input, output)) flags.push('fallback-encoding');
  return flags;
}

export function inspectProbe(
  id: string,
  convert: Converter,
  isFallback?: Fallback
): ProbeResult {
  const probe = probes[id];
  const output = convert(probe.input);
  if (typeof output !== 'string')
    throw new TypeError(`Non-string output for probe ${id}`);
  const flags = inspectOutput(probe.input, output, isFallback);
  const normalized = output
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/gu, '');
  if (probe.readings && !probe.readings.includes(normalized))
    flags.push('reading-mismatch');
  return {
    id,
    input: probe.input,
    output,
    flags,
    assessment: flags.length
      ? 'not-valid-reading'
      : probe.readings
        ? 'probe-matched-only'
        : 'reading-unverified',
    cjk: probe.cjk ?? false,
  };
}

```

UNIDECODE SOURCE EXCERPTS
/**
 * Unidecode takes UTF-8 data and tries to represent it in US-ASCII characters (i.e., the universally displayable characters between 0x00 and 0x7F).
 * The representation is almost always an attempt at transliteration -- i.e., conveying, in Roman letters, the pronunciation expressed by the text in
 * some other writing system.
 *
 * The tables used (in data) are converted from the tables provided in the perl library Text::Unidecode (http://search.cpan.org/dist/Text-Unidecode/lib/Text/Unidecode.pm)
 * and are distributed under the perl license
 *
 * @author Francois-Guillaume Ribreau
 *
 * Based on the port of unidecode for php
 */

'use strict';

var tr = {};
var utf8_rx = /(?![\x00-\x7F]|[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3})./g;

module.exports = function (str, sub) {
  return str.replace(utf8_rx, function (match) {
    return unidecode_internal_replace(match, sub);
  });
};

function unidecode_internal_replace(match, sub) {
  // Default sub to empty string
  if (sub === null || sub === undefined) {
    sub = '';
  }

  var utf16 = utf8_to_utf16(match);

  if (utf16 > 0xFFFF) {
    return sub;
  } else {

    var h = utf16 >> 8;
    var l = utf16 & 0xFF;

    // (18) 18 > h < 1e (30)
    if (h > 24 && h < 30) return sub;

    //(d7) 215 > h < 249 (f9) no supported
    if (h > 215 && h < 249) return sub;

    if (!tr[h]) {
      switch (dec2hex(h)) {
      case '00':
        tr[h] = require('./data/x00');
        break;
      case '01':
        tr[h] = require('./data/x01');
        break;
      case '02':
        tr[h] = require('./data/x02');
        break;
      case '03':
        tr[h] = require('./data/x03');
        break;
      case '04':
        tr[h] = require('./data/x04');
        break;
      case '05':
        tr[h] = require('./data/x05');
        break;
      case 'fc':
        tr[h] = require('./data/xfc');
        break;
      case 'fd':
        tr[h] = require('./data/xfd');
        break;
      case 'fe':
        tr[h] = require('./data/xfe');
        break;
      case 'ff':
        tr[h] = require('./data/xff');
        break;
      default:
        // console.error("Unidecode file not found for h=", h);
        return sub;
      }
    }

    if (tr[h][l]) {
      return tr[h][l];
    } else {
      return sub;
    }
  }
}

function dec2hex(i) {
  return (i + 0x100).toString(16).substr(-2);
}

function utf8_to_utf16(raw) {
  var b1, b2, b3, b4,
    x, y, z;

  while (Array.isArray(raw)) raw = raw[0];

  switch (raw.length) {
  case 1:
    return ord(raw);

    // http://en.wikipedia.org/wiki/UTF-8
  case 2:
    b1 = ord(raw.substr(0, 1));
    b2 = ord(raw.substr(1, 1));

    x = ((b1 & 0x03) << 6) | (b2 & 0x3F);
    y = (b1 & 0x1C) >> 2;

    return (y << 8) | x;

  case 3:
    b1 = ord(raw.substr(0, 1));
    b2 = ord(raw.substr(1, 1));
    b3 = ord(raw.substr(2, 1));

    x = ((b2 & 0x03) << 6) | (b3 & 0x3F);
    y = ((b1 & 0x0F) << 4) | ((b2 & 0x3C) >> 2);

    return (y << 8) | x;

  default:
    b1 = ord(raw.substr(0, 1));
    b2 = ord(raw.substr(1, 1));
    b3 = ord(raw.substr(2, 1));
    b4 = ord(raw.substr(3, 1));

    x = ((b3 & 0x03) << 6) | (b4 & 0x3F);
    y = ((b2 & 0x0F) << 4) | ((b3 & 0x3C) >> 2);
    z = ((b1 & 0x07) << 5) | ((b2 & 0x30) >> 4);

    return (z << 16) | (y << 8) | x;
  }
}

/* From php.js */

function ord(string) {
  // Returns the codepoint value of a character
  //
  // version: 1109.2015
  // discuss at: http://phpjs.org/functions/ord
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Onno Marsman
  // +   improved by: Brett Zamir (http://brett-zamir.me)
  // +   input by: incidence
  // *     example 1: ord('K');
  // *     returns 1: 75
  // *     example 2: ord('\uD800\uDC00'); // surrogate pair to create a single Unicode character
  // *     returns 2: 65536
  var str = string + '',
    code = str.charCodeAt(0);
  if (0xD800 <= code && code <= 0xDBFF) { // High surrogate (could change last hex to 0xDB7F to treat high private surrogates as single characters)
    var hi = code;
    if (str.length === 1) {
      return code; // This is just a high surrogate with no following low surrogate, so we return its value;
      // we could also throw an error as it is not a complete character, but someone may want to know
    }
    var low = str.charCodeAt(1);
    return ((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
  }
  if (0xDC00 <= code && code <= 0xDFFF) { // Low surrogate
    return code; // This is just a low surrogate with no preceding high surrogate, so we return its value;
    // we could also throw an error as it is not a complete character, but someone may want to know
  }
  return code;
}