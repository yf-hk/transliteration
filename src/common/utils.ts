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
        clonedObj[key] = deepClone(obj[key]);
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
 * @param ignored Ignore certain string values within the matched strings
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex regex replacement algorithm with ignore handling
export function regexpReplaceCustom(
  source: string,
  regexp: RegExp,
  replacement: string,
  ignored: string[] = []
) {
  // RegExp version of ignored
  const ignoredRegexp = ignored.length
    ? new RegExp(ignored.map(escapeRegExp).join('|'), 'g')
    : null;
  // clones regex and with g flag
  const rule = new RegExp(regexp.source, `${regexp.flags.replace('g', '')}g`);
  // final result
  let result = '';
  // used to count where
  let lastIndex = 0;
  while (true) {
    const matchMain = rule.exec(source);
    let ignoreResult = '';
    let ignoreLastIndex = 0;
    if (matchMain) {
      while (true) {
        const matchIgnore = ignoredRegexp?.exec(matchMain[0]);
        if (matchIgnore && ignoredRegexp) {
          ignoreResult +=
            matchIgnore.index > ignoreLastIndex ? replacement : '';
          ignoreResult += matchIgnore[0];
          ignoreLastIndex = ignoredRegexp.lastIndex;
        } else {
          ignoreResult +=
            matchMain[0].length > ignoreLastIndex ? replacement : '';
          break;
        }
      }
      result += source.substring(lastIndex, matchMain.index) + ignoreResult;
      lastIndex = rule.lastIndex;
    } else {
      result += source.substring(lastIndex, source.length);
      break;
    }
  }
  return result;
}
