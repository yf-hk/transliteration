import { describe, expect, it } from 'bun:test';
import type { Charmap } from '../../data/charmap';
import { Slugify } from './slugify';
import { registerDefaultMap, Transliterate } from './transliterate';

function createMap(): Charmap {
  const map: Charmap = { é: 'e', 你: 'Ni', 好: 'Hao', '🚀': 'Rocket' };
  for (let code = 0; code < 128; code++) {
    const char = String.fromCharCode(code);
    map[char] = char;
  }
  return map;
}

describe('default and live character maps', () => {
  it('preserves default ASCII, Unicode code points and unknowns before map exposure', () => {
    const map = createMap();
    registerDefaultMap(map);
    const convert = new Transliterate({}, map);
    expect(convert.transliterate('a\0\n\x7fé🚀𠮷', { unknown: '?' })).toBe(
      'a\0\n\x7feRocket?'
    );
    expect(convert.transliterate('a你b', { fixChineseSpacing: false })).toBe(
      'aNib'
    );
    expect(convert.transliterate('你a1')).toBe('Ni a 1');
  });

  it('keeps native scanning correct across Han, Latin and supplementary calls', () => {
    const map = createMap();
    registerDefaultMap(map);
    const convert = new Transliterate({}, map);
    const cases: [string, string][] = [
      ['你好', 'Ni Hao'],
      ['é', 'e'],
      ['你好', 'Ni Hao'],
      ['😀', ''],
      ['ab', 'ab'],
      ['🚀', 'Rocket'],
      ['é', 'e'],
      ['\ud800', ''],
      ['a\0\x7f', 'a\0\x7f'],
    ];
    for (const [source, expected] of cases) {
      expect(convert.transliterate(source)).toBe(expected);
    }
  });

  it('replaces absent Unicode code points with a literal primitive unknown value', () => {
    const map = createMap();
    map.é = '';
    registerDefaultMap(map);
    const convert = new Transliterate({}, map);
    const unknown = '$&$$$1';
    expect(
      convert.transliterate('aé😀𠮷\ud800b', {
        unknown,
        fixChineseSpacing: false,
      })
    ).toBe(`a${unknown}${unknown}${unknown}b`);
    expect(
      Reflect.apply(convert.transliterate, convert, ['a😀b', { unknown: null }])
    ).toBe('ab');
  });

  it('keeps map identity and observes sibling getters, deletion and inherited entries', () => {
    const map = createMap();
    registerDefaultMap(map);
    const transliterate = new Transliterate({}, map);
    const slugify = new Slugify({}, map);
    const live = slugify.setData();
    expect(live).toBe(map);
    expect(transliterate.setData()).toBe(live);
    let reads = 0;
    Object.defineProperty(live, 'a', {
      configurable: true,
      get() {
        reads++;
        live.b = 'B';
        return 'A';
      },
    });
    expect(transliterate.transliterate('aaab')).toBe('AAAB');
    expect(reads).toBe(3);
    expect(slugify.slugify('ab')).toBe('ab');
    delete live.a;
    Object.setPrototypeOf(live, { a: 'Inherited' });
    expect(transliterate.transliterate('ab')).toBe('InheritedB');
    delete live.b;
    expect(transliterate.transliterate('ab', { unknown: '?' })).toBe(
      'Inherited?'
    );
  });

  it('does not trust a map again after it has been exposed', () => {
    const map = createMap();
    registerDefaultMap(map);
    const convert = new Transliterate({}, map);
    const live = convert.setData();
    registerDefaultMap(map);
    live.a = 'Changed';
    expect(convert.transliterate('a')).toBe('Changed');
  });

  it('does not trust ASCII accessors or inherited identity mappings', () => {
    for (const inherited of [false, true]) {
      const map = createMap();
      let value = 'a';
      let reads = 0;
      const target = inherited ? {} : map;
      Object.defineProperty(target, 'a', {
        configurable: true,
        get() {
          reads++;
          return value;
        },
      });
      if (inherited) {
        delete map.a;
        Object.setPrototypeOf(map, target);
      }
      registerDefaultMap(map);
      expect(reads).toBe(0);
      value = 'Changed';
      expect(new Transliterate({}, map).transliterate('a')).toBe('Changed');
      expect(reads).toBe(1);
    }
  });

  it('uses a generic map during reentrant or interrupted custom updates', () => {
    const map = createMap();
    registerDefaultMap(map);
    const convert = new Transliterate({}, map);
    const sibling = new Transliterate({}, map);
    const updates = { a: 'A' };
    Object.defineProperty(updates, 'b', {
      enumerable: true,
      get() {
        expect(convert.transliterate('ab')).toBe('Ab');
        expect(sibling.transliterate('ab')).toBe('ab');
        throw new Error('interrupted update');
      },
    });
    expect(() => convert.setData(updates)).toThrow('interrupted update');
    expect(convert.transliterate('ab')).toBe('Ab');
    expect(sibling.transliterate('ab')).toBe('ab');
  });

  it('observes direct changes to unregistered constructor maps', () => {
    const map = { a: 'a' };
    const convert = new Transliterate({}, map);
    expect(convert.transliterate('a')).toBe('a');
    map.a = 'Changed';
    expect(convert.transliterate('a')).toBe('Changed');
  });

  it('uses maps exposed during input coercion with the original options snapshot', () => {
    const map = createMap();
    registerDefaultMap(map);
    const convert = new Transliterate({}, map);
    const source = {
      toString() {
        convert.setData().a = 'Changed';
        convert.config({ replace: { a: 'POST' } });
        return 'a';
      },
    };
    expect(Reflect.apply(convert.transliterate, convert, [source])).toBe(
      'Changed'
    );
    expect(convert.transliterate('a')).toBe('POST');
  });

  it('observes maps exposed while coercing replacement or unknown values', () => {
    for (const mode of ['replace', 'unknown']) {
      const map = createMap();
      registerDefaultMap(map);
      const convert = new Transliterate({}, map);
      const value = {
        toString() {
          convert.setData().a = 'A';
          return mode === 'replace' ? 'ab' : '?';
        },
      };
      const options =
        mode === 'replace' ? { replace: { x: value } } : { unknown: value };
      expect(
        Reflect.apply(convert.transliterate, convert, [
          mode === 'replace' ? 'x' : '😀ab',
          options,
        ])
      ).toBe(mode === 'replace' ? 'Ab' : '?Ab');
    }
  });

  it('observes inherited getters that expose a map during conversion', () => {
    const map = createMap();
    registerDefaultMap(map);
    const convert = new Transliterate({}, map);
    let reads = 0;
    Object.defineProperty(Object.prototype, '😀', {
      configurable: true,
      get() {
        reads++;
        convert.setData().a = 'X';
        return 'R';
      },
    });
    try {
      expect(convert.transliterate('😀a')).toBe('RX');
      expect(reads).toBe(1);
    } finally {
      Reflect.deleteProperty(Object.prototype, '😀');
    }
  });

  it.each([
    { input: 'é😀a', options: undefined, expected: 'eXA' },
    { input: '你😀a', options: undefined, expected: 'Ni XA' },
    { input: 'é😀a', options: { ignore: ['é'] }, expected: 'éXA' },
    {
      input: 'é😀a',
      options: { unknown: { toString: () => '?' } },
      expected: 'eXA',
    },
  ])(
    'treats a getter receiver as an exposed map before reentrant calls (%#)',
    ({ input, options, expected }) => {
      const map = createMap();
      registerDefaultMap(map);
      const convert = new Transliterate({}, map);
      const sibling = new Slugify({}, map);
      convert.transliterate('é🚀');
      let receiver: Charmap | undefined;
      let reentrant = '';
      let reads = 0;
      Object.defineProperty(Object.prototype, '😀', {
        configurable: true,
        get(this: Charmap) {
          receiver = this;
          reads++;
          this.a = 'A';
          reentrant = convert.transliterate('a');
          return 'X';
        },
      });
      try {
        expect(
          Reflect.apply(convert.transliterate, convert, [input, options])
        ).toBe(expected);
        expect(reentrant).toBe('A');
        expect(reads).toBe(1);
      } finally {
        Reflect.deleteProperty(Object.prototype, '😀');
      }
      expect(receiver).toBe(map);
      if (receiver === undefined) throw new Error('Missing getter receiver');
      receiver.a = 'Z';
      receiver.é = 'LATER';
      expect(convert.transliterate('éa')).toBe('LATERZ');
      expect(sibling.slugify('éa')).toBe('laterz');
    }
  );

  it('exposes own accessor receivers before reading them', () => {
    const map = createMap();
    const convert = new Transliterate({}, map);
    let reentrant = '';
    let reads = 0;
    Object.defineProperty(map, 'é', {
      configurable: true,
      get(this: Charmap) {
        reads++;
        this.a = 'A';
        reentrant = convert.transliterate('a');
        return 'E';
      },
    });
    registerDefaultMap(map);
    expect(convert.transliterate('éa')).toBe('EA');
    expect(reentrant).toBe('A');
    expect(reads).toBe(1);
    expect(convert.transliterate('a')).toBe('A');
  });

  it('constructs private index pages without inherited integer writes', () => {
    const map = createMap();
    registerDefaultMap(map);
    const convert = new Transliterate({}, map);
    let writes = 0;
    Object.defineProperty(Array.prototype, '233', {
      configurable: true,
      set() {
        writes++;
      },
    });
    try {
      expect(convert.transliterate('é🚀')).toBe('eRocket');
      expect(writes).toBe(0);
    } finally {
      Reflect.deleteProperty(Array.prototype, '233');
    }
  });

  it.each([false, true])(
    'exposes source maps before cloning own accessor values (reset: %s)',
    (reset) => {
      const map = createMap();
      const convert = new Transliterate({}, map);
      const sibling = new Transliterate({}, map);
      let receiver: Charmap | undefined;
      let reentrant = '';
      Object.defineProperty(map, 'é', {
        configurable: true,
        enumerable: true,
        get(this: Charmap) {
          receiver = this;
          this.a = 'A';
          reentrant = sibling.transliterate('a');
          return 'E';
        },
      });
      registerDefaultMap(map);
      sibling.transliterate('🚀');
      convert.setData(reset ? undefined : { b: 'B' }, reset);
      expect(receiver).toBe(map);
      expect(reentrant).toBe('A');
      if (receiver === undefined) throw new Error('Missing clone receiver');
      receiver.a = 'Z';
      expect(sibling.transliterate('a')).toBe('Z');
    }
  );

  it('reads enumerable symbol getters on live configuration', () => {
    const map = createMap();
    registerDefaultMap(map);
    for (const convert of [new Transliterate({}, map), new Slugify({}, map)]) {
      let reads = 0;
      Object.defineProperty(convert.config(), Symbol('config'), {
        enumerable: true,
        get() {
          reads++;
          return 'value';
        },
      });
      if (convert instanceof Slugify)
        expect(convert.slugify('abc')).toBe('abc');
      else expect(convert.transliterate('abc')).toBe('abc');
      expect(reads).toBe(1);
    }
  });
});
