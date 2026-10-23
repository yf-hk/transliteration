import { describe, expect, it } from 'bun:test';
import {
  deepClone,
  escapeRegExp,
  findStrOccurrences,
  inRange,
  regexpReplaceCustom,
} from './utils';

describe('escapeRegex()', () => {
  it('should escape values', () => {
    const escaped = '\\^\\$\\.\\*\\+\\?\\(\\)\\[\\]\\{\\}\\|\\\\';
    const unescaped = '^$.*+?()[]{}|\\';
    expect(escapeRegExp(unescaped + unescaped)).toBe(escaped + escaped);
  });

  it('should handle strings with nothing to escape', () => {
    expect(escapeRegExp('abc')).toBe('abc');
  });

  it('should return an empty string for empty values', () => {
    const values = [null, undefined, ''];
    const expected: string[] = values.map(() => '');
    const actual = values.map((value) => escapeRegExp(value as string));
    expect(expected).toEqual(actual);
  });
});

describe('findStrOccurrences()', () => {
  it('should find string occurrences', () => {
    const tests: [string, string[], [number, number][]][] = [
      [
        'test',
        ['t'],
        [
          [0, 0],
          [3, 3],
        ],
      ],
      [
        'testtest',
        ['e', 't'],
        [
          [0, 1],
          [3, 5],
          [7, 7],
        ],
      ],
      [
        '你好呀你好',
        ['你', '呀'],
        [
          [0, 0],
          [2, 3],
        ],
      ],
      ['abcbde', ['bc', 'bcb'], [[1, 3]]],
      ['aaaaaa', ['aa', 'aaa'], [[0, 5]]],
    ];
    for (const [source, searches, result] of tests) {
      expect(findStrOccurrences(source, searches)).toEqual(result);
    }
  });
});

describe('inRange()', () => {
  it('should check if number is in range', () => {
    const tests: [number, [number, number][], boolean][] = [
      [
        5,
        [
          [1, 2],
          [5, 5],
          [7, 9],
        ],
        true,
      ],
      [5, [[1, 10]], true],
      [
        6,
        [
          [0, 2],
          [3, 4],
        ],
        false,
      ],
      [
        6,
        [
          [7, 9],
          [10, 15],
        ],
        false,
      ],
      [
        3,
        [
          [1, 2],
          [4, 4],
          [6, 7],
          [9, 10],
          [31, 32],
          [33, 34],
          [35, 36],
          [38, 38],
          [40, 42],
        ],
        false,
      ],
      [
        35,
        [
          [1, 2],
          [4, 4],
          [6, 7],
          [9, 10],
          [31, 32],
          [33, 34],
          [36, 36],
          [38, 38],
          [40, 42],
        ],
        false,
      ],
      [
        35,
        [
          [1, 2],
          [4, 4],
          [6, 7],
          [9, 10],
          [31, 32],
          [33, 34],
          [35, 35],
          [38, 38],
          [40, 42],
        ],
        true,
      ],
    ];
    for (const [find, range, result] of tests) {
      expect(inRange(find, range)).toBe(result);
    }
  });
});

describe('regexpReplaceCustom', () => {
  it('keeps replacement strings literal when nothing is ignored', () => {
    expect(regexpReplaceCustom('aba', /a/g, '$&$$$1')).toBe('$&$$$1b$&$$$1');
    expect(regexpReplaceCustom('aba', /a/g, '$&', ['missing'])).toBe('$&b$&');
  });

  it('advances zero-width Unicode matches and preserves caller regex state', () => {
    const pattern = /(?:)/gu;
    pattern.lastIndex = 2;
    expect(regexpReplaceCustom('🚀a', pattern, '|')).toBe('|🚀|a|');
    expect(pattern.lastIndex).toBe(2);
    expect(regexpReplaceCustom('a😀b', /(?:)/, '-')).toBe(
      '-a-\ud83d-\ude00-b-'
    );
    expect(regexpReplaceCustom('aa', /(?<=a)/, '-')).toBe('a-a-');
    expect(regexpReplaceCustom('aab', /a/y, '-')).toBe('--b');
    expect(regexpReplaceCustom('baab', /a/y, '-')).toBe('baab');
  });

  it('should replace with custom regexp', () => {
    expect(
      regexpReplaceCustom('abc!(!!$!#!##!def', /[^a-zA-Z0-9-_.~]+/g, '-', [
        '$',
        '(',
        '##',
      ])
    ).toBe('abc-(-$-##-def');

    expect(
      regexpReplaceCustom('abc!!!$!!!def!!jdj', /[^a-zA-Z0-9-_.~]+/g, '-', [
        '$',
        '(',
        '##',
      ])
    ).toBe('abc-$-def-jdj');

    expect(
      regexpReplaceCustom('abc!!!$!!!def!!jdj', /[^a-zA-Z0-9-_.~]+/g, '-', [])
    ).toBe('abc-def-jdj');

    expect(
      regexpReplaceCustom('abc$def', /[^a-zA-Z0-9-_.~]+/g, '-', ['$'])
    ).toBe('abc$def');

    expect(regexpReplaceCustom('abc$def', /[^a-zA-Z0-9-_.~]+/g, '-')).toBe(
      'abc-def'
    );

    // Test case where ignored pattern is at the end of matched string (covers line 186-189)
    expect(
      regexpReplaceCustom('abc!!!$', /[^a-zA-Z0-9-_.~]+/g, '-', ['$'])
    ).toBe('abc-$');

    // Test case where ignored pattern consumes entire match
    expect(
      regexpReplaceCustom('abc$$$def', /[^a-zA-Z0-9-_.~]+/g, '-', ['$$$'])
    ).toBe('abc$$$def');

    // Test case where ignoreLastIndex equals matchMain[0].length (covers line 186-189 false branch)
    expect(regexpReplaceCustom('abc$def', /\$/g, '-', ['$'])).toBe('abc$def');

    // Test case with multiple consecutive ignored patterns (covers line 185 false branch and line 188)
    expect(regexpReplaceCustom('abc$$$def', /[^a-zA-Z0-9]+/g, '-', ['$'])).toBe(
      'abc$$$def'
    );
  });
});

describe('deepClone', () => {
  it('clones own __proto__ properties as data without changing prototypes', () => {
    const source = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"nested":{"__proto__":"literal"}}'
    );
    const cloned = deepClone(source);
    expect(Object.getPrototypeOf(cloned)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(cloned.nested)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(cloned, '__proto__')).toEqual({
      value: { polluted: true },
      writable: true,
      enumerable: true,
      configurable: true,
    });
    expect(
      Object.getOwnPropertyDescriptor(cloned.nested, '__proto__')?.value
    ).toBe('literal');
    expect(cloned).toEqual(source);
    expect(cloned.polluted).toBeUndefined();
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
    const original = Object.getOwnPropertyDescriptor(
      source,
      '__proto__'
    )?.value;
    original.polluted = false;
    source.constructor.prototype.polluted = false;
    expect(Object.getOwnPropertyDescriptor(cloned, '__proto__')?.value).toEqual(
      {
        polluted: true,
      }
    );
    expect(cloned.constructor.prototype.polluted).toBe(true);
  });

  it('should deep clone objects', () => {
    const o = { a: 'b' };
    const a = ['a'];
    const d = new Date();
    const r = /a/g;
    const s = 'a';
    const c = { o, a, d, r, s };

    expect(deepClone(o)).not.toBe(o);
    expect(deepClone(o)).toEqual(o);
    expect(deepClone(a)).not.toBe(a);
    expect(deepClone(a)).toEqual(a);
    expect(deepClone(d)).not.toBe(d);
    expect(deepClone(d)).toEqual(d);
    expect(deepClone(r)).not.toBe(r);
    expect(deepClone(r)).toEqual(r);
    expect(deepClone(s)).toBe(s);
    expect(deepClone(s)).toEqual(s);
    expect(deepClone(c)).not.toBe(c);
    expect(deepClone(c)).toEqual(c);
  });

  it('should only clone own properties', () => {
    // Create object with inherited property to cover Object.hasOwn branch
    const proto = { inherited: 'value' };
    const obj = Object.create(proto) as { own: string; inherited?: string };
    obj.own = 'ownValue';
    const cloned = deepClone(obj);
    expect(cloned.own).toBe('ownValue');
    // inherited property should not be cloned as own property
    expect(Object.hasOwn(cloned, 'inherited')).toBe(false);
  });
});
