/**
 * Tests are taken from Text-Unidecode-0.04/test.pl
 *
 * @see <http://search.cpan.org/~sburke/Text-Unidecode-0.04/lib/Text/Unidecode.pm>
 */
import { describe, expect, it } from 'bun:test';
import { charmap } from '../../data/charmap';
import { transliterate as tr } from '../node';
import type {
  IntervalArray,
  OptionReplaceArray,
  OptionReplaceCombined,
  OptionReplaceObject,
} from '../types';
import { defaultOptions, Transliterate } from './transliterate';

const DIGITS_REGEX = /\d+/;
const DIGIT_GLOBAL_REGEX = /\d/g;
const WORLD_CASE_INSENSITIVE_REGEX = /world/i;

describe('transliterate()', () => {
  describe('Purity tests', () => {
    it('should return ASCII characters unchanged', () => {
      const tests: string[] = [];
      for (let i = 1; tests.length < 127; i += 1) {
        tests.push(String.fromCharCode(i));
      }

      for (const str of tests) {
        expect(tr(str)).toBe(str);
      }
    });
  });

  describe('Basic string tests', () => {
    it('should handle basic strings', () => {
      const tests: (string | number)[] = [
        '',
        1 / 10,
        'I like pie.',
        '\n',
        '\r\n',
        'I like pie.\n',
      ];

      for (const str of tests) {
        expect(tr(str.toString())).toBe(str.toString());
      }
    });
  });

  describe('Complex tests', () => {
    it('should transliterate various scripts correctly', () => {
      const tests: [string, string][] = [
        ['Æneid', 'AEneid'],
        ['étude', 'etude'],
        ['北亰', 'Bei Jing'],
        ['ᔕᓇᓇ', 'shanana'],
        ['ᏔᎵᏆ', 'taliqua'],
        ['ܦܛܽܐܺ', "ptu'i"],
        ['अभिजीत', 'abhijiit'],
        ['অভিজীত', 'abhijiit'],
        ['അഭിജീത', 'abhijiit'],
        ['മലയാലമ്', 'mlyaalm'],
        ['げんまい茶', 'genmaiCha'],
        [`\u0800\u1400${unescape('%uD840%uDD00')}`, ''],
      ];

      for (const [str, result] of tests) {
        expect(tr(str)).toBe(result);
      }
    });
  });

  describe('With ignore option', () => {
    it('walks ignored ranges once while preserving Chinese spacing', () => {
      const count = 512;
      const source = '你é '.repeat(count);
      let reads = 0;
      const ranges: IntervalArray = Array.from({ length: count }, (_, i) => [
        i * 3,
        i * 3,
      ]);
      const observed = new Proxy(ranges, {
        get(target, property, receiver) {
          if (
            typeof property === 'string' &&
            Number.isInteger(Number(property))
          ) {
            reads += 1;
          }
          return Reflect.get(target, property, receiver);
        },
      });
      const engine = new Transliterate({}, charmap);
      expect(engine.codeMapReplace(source, defaultOptions, observed)).toBe(
        '你 e '.repeat(count)
      );
      expect(reads).toBeLessThan(source.length * 10);
    });

    it('preserves merged tokens and either half of supplementary characters', () => {
      expect(tr('你你好é你你好', { ignore: ['你', '你好', '你你'] })).toBe(
        '你你好 e 你你好'
      );
      for (const ignore of [['🚀'], ['\ud83d']]) {
        expect(tr('你🚀é', { ignore })).toBe('Ni 🚀e');
      }
      expect(tr('你🚀é', { ignore: ['\ude80'] })).toBe('Ni🚀e');
      expect(tr('你🚀é', { ignore: ['你🚀é'] })).toBe('你🚀é');
    });

    it('should ignore specified characters', () => {
      const tests: [string, string[], string][] = [
        ['Æneid', ['Æ'], 'Æneid'],
        ['你好，世界！', ['，', '！'], 'Ni Hao，Shi Jie！'],
        ['你好，世界！', ['你好', '！'], '你好,Shi Jie！'],
      ];
      for (const [str, ignore, result] of tests) {
        expect(tr(str, { ignore })).toBe(result);
      }
    });
  });

  describe('With replace option', () => {
    it('preserves own __proto__ replacement entries', () => {
      const replace: OptionReplaceObject = JSON.parse(
        '{"__proto__":"safe","constructor":"ctor","prototype":"proto"}'
      );
      expect(tr('__proto__ constructor prototype', { replace })).toBe(
        'safe ctor proto'
      );
    });

    it('should replace specified strings', () => {
      const tests: [string, OptionReplaceCombined, string][] = [
        ['你好，世界！', [['你好', 'Hola']], 'Hola,Shi Jie!'],
        ['你好，世界！', { 你好: 'Hola' }, 'Hola,Shi Jie!'],
        ['你好，世界!', { 好: 'Good' }, 'Ni Good,Shi Jie!'],
      ];
      for (const [str, replace, result] of tests) {
        expect(tr(str, { replace })).toBe(result);
      }
    });

    it('should handle replace with ignore', () => {
      expect(
        tr('你好，世界！', {
          replace: { 好: 'Good' },
          ignore: ['界'],
        })
      ).toBe('Ni Good,Shi 界!');
    });
  });

  describe('With replaceAfter option', () => {
    it('should replace after transliteration', () => {
      const tests: [string, OptionReplaceCombined, string][] = [
        ['你好，世界！', [['Ni Hao', 'Hola']], 'Hola,Shi Jie!'],
        ['你好，世界！', { 'Ni Hao': 'Hola' }, 'Hola,Shi Jie!'],
      ];
      for (const [str, replaceAfter, result] of tests) {
        expect(tr(str, { replaceAfter })).toBe(result);
      }
    });
  });

  describe('With replace / replaceAfter and ignore options', () => {
    it('should handle combined options', () => {
      expect(
        tr('你好, 世界!', {
          replace: [
            ['你好', 'Hola'],
            ['世界', 'mundo'],
          ],
          ignore: ['¡', '!'],
        })
      ).toBe('Hola, mundo!');

      expect(
        tr('你好，世界！', { replaceAfter: [['你', 'tú']], ignore: ['你'] })
      ).toBe('tú Hao,Shi Jie!');
    });
  });

  describe('With trim option', () => {
    it('should trim whitespace when enabled', () => {
      expect(tr(' \t\r\n你好，世界！\t\r\n ', { trim: true })).toBe(
        'Ni Hao,Shi Jie!'
      );
      expect(tr(' \t\r\n你好，世界！\t\r\n ', { trim: false })).toBe(
        ' \t\r\nNi Hao,Shi Jie!\t\r\n '
      );
    });
  });

  describe('With unknown option', () => {
    it('should use placeholder for unknown characters', () => {
      expect(tr('🚀', { unknown: '?' })).toBe('?');
    });

    it('should preserve known silent mappings with an unknown placeholder', () => {
      expect(tr('ЪъЬь', { unknown: '?' })).toBe('');
      expect(tr('e\u0301🚀', { unknown: '?' })).toBe('e?');
      expect(tr.setData()).toHaveProperty('ъ', '');
    });

    it('should preserve explicit empty custom mappings and restore them on reset', () => {
      try {
        tr.setData({ x: '', ъ: 'X' });
        expect(tr('axb🚀', { unknown: '?' })).toBe('ab?');
        expect(tr('ъ', { unknown: '?' })).toBe('X');
      } finally {
        tr.setData(undefined, true);
      }
      expect(tr('ъ🚀', { unknown: '?' })).toBe('?');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      expect(tr('')).toBe('');
    });

    it('should handle strings with only whitespace', () => {
      expect(tr('   ')).toBe('   ');
      expect(tr('\t\n\r')).toBe('\t\n\r');
    });

    it('should handle mixed scripts in single string', () => {
      expect(tr('你好 Hello 世界')).toBe('Ni Hao Hello Shi Jie');
      expect(tr('Café 北京 Tokyo')).toBe('Cafe Bei Jing Tokyo');
    });

    it('should handle surrogate pairs (UTF-32 characters)', () => {
      // Mathematical bold capital A (U+1D400)
      expect(tr('\uD835\uDC00')).toBe('');
      // CJK Extension B character
      expect(tr('\uD840\uDC00')).toBe('');
    });

    it('should handle very long strings', () => {
      const longChinese = '你好'.repeat(100);
      const result = tr(longChinese);
      expect(result).toContain('Ni Hao');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle strings with numbers', () => {
      expect(tr('你好123世界')).toBe('Ni Hao 123 Shi Jie');
      expect(tr('2024年')).toBe('2024 Nian');
    });

    it('should handle strings with special ASCII characters', () => {
      expect(tr('Hello@World#2024!')).toBe('Hello@World#2024!');
      expect(tr('你好@世界')).toBe('Ni Hao@Shi Jie');
    });

    it('should handle consecutive non-ASCII characters', () => {
      expect(tr('éèêë')).toBe('eeee');
      expect(tr('üöä')).toBe('uoa');
    });

    it('should handle Korean characters', () => {
      expect(tr('안녕하세요')).toBe('annyeonghaseyo');
    });

    it('should handle Arabic characters', () => {
      expect(tr('مرحبا')).toBe('mrHb');
    });

    it('should handle Russian/Cyrillic characters', () => {
      expect(tr('Привет')).toBe('Privet');
      expect(tr('Москва')).toBe('Moskva');
    });

    it('should handle Greek characters', () => {
      expect(tr('Αθήνα')).toBe('Athina');
    });

    it('should handle Thai characters', () => {
      expect(tr('สวัสดี')).toBe('swasdii');
    });

    it('should handle Hebrew characters', () => {
      expect(tr('שלום')).toBe('shlvm');
    });
  });

  describe('Chinese spacing behavior', () => {
    it('should separate Chinese, Latin and number runs symmetrically', () => {
      expect(tr('hello世界')).toBe('hello Shi Jie');
      expect(tr('你好world')).toBe('Ni Hao world');
      expect(tr('2022年中文01英文nihao02')).toBe(
        '2022 Nian Zhong Wen 01 Ying Wen nihao 02'
      );
      expect(tr('é中')).toBe('e Zhong');
      expect(tr('げんまい茶')).toBe('genmaiCha');
      expect(tr('iPhone15')).toBe('iPhone15');
    });

    it('should not add spaces for empty mappings or inside ignored strings', () => {
      expect(tr('你ъ', { unknown: '?' })).toBe('Ni');
      expect(tr('你ъ好', { unknown: '?' })).toBe('Ni Hao');
      expect(tr('a\u0301中', { unknown: '?' })).toBe('a Zhong');
      expect(tr('hello世界', { ignore: ['hello世界'] })).toBe('hello世界');
      expect(tr('你好SKU12', { ignore: ['SKU12'] })).toBe('Ni Hao SKU12');
      expect(tr('hello世界', { fixChineseSpacing: false })).toBe('helloShiJie');
    });

    it('should add spaces between Chinese characters by default', () => {
      expect(tr('你好')).toBe('Ni Hao');
      expect(tr('北京市')).toBe('Bei Jing Shi');
    });

    it('should not add extra spaces around punctuation', () => {
      expect(tr('你好，世界')).toBe('Ni Hao,Shi Jie');
    });

    it('should respect trailing spaces and punctuation in custom mappings', () => {
      try {
        tr.setData({ x: 'x ', y: 'y,' });
        expect(tr('x你')).toBe('x Ni');
        expect(tr('y你')).toBe('y,Ni');
      } finally {
        tr.setData(undefined, true);
      }
    });

    it('should handle fixChineseSpacing option', () => {
      expect(tr('你好', { fixChineseSpacing: false })).toBe('NiHao');
      expect(tr('你好', { fixChineseSpacing: true })).toBe('Ni Hao');
    });
  });

  describe('Reported Latin and compatibility mappings', () => {
    it('should preserve acute Y and capital sharp S', () => {
      expect(tr('ýÝ')).toBe('yY');
      expect(tr('STRAẞE')).toBe('STRASSE');
      expect(tr('ßẞ')).toBe('ssSS');
    });

    it('should map the compatibility characters reported with capital sharp S', () => {
      expect(tr('ᴀ ₐ ①')).toBe('A a 1');
    });
  });

  describe('Replace with regex', () => {
    it('should handle regex patterns in replace option', () => {
      expect(tr('test123test', { replace: [[DIGITS_REGEX, 'NUM']] })).toBe(
        'testNUMtest'
      );
    });

    it('should handle global regex patterns', () => {
      expect(tr('a1b2c3', { replace: [[DIGIT_GLOBAL_REGEX, 'X']] })).toBe(
        'aXbXcX'
      );
    });

    it('should handle regex with flags', () => {
      expect(
        tr('Hello WORLD', {
          replace: [[WORLD_CASE_INSENSITIVE_REGEX, 'Earth']],
        })
      ).toBe('Hello Earth');
    });
  });

  describe('With non-string source', () => {
    it('should convert non-string source to string', () => {
      // Covers line 214 - force convert to string
      expect(tr(123 as unknown as string)).toBe('123');
      expect(tr(null as unknown as string)).toBe('null');
      expect(tr(undefined as unknown as string)).toBe('undefined');
    });
  });
});

describe('replaceStr()', () => {
  it('should replace strings correctly', () => {
    const transliterate = new Transliterate({}, charmap);
    const replaceString = transliterate.replaceString.bind(transliterate);
    const tests: [string, [string | RegExp, string][], string][] = [
      [
        'abbc',
        [
          ['a', 'aa'],
          [/b+/g, 'B'],
        ],
        'aaBc',
      ],
      ['abbc', [[false as unknown as string, '']], 'abbc'],
    ];
    for (const [str, replace, result] of tests) {
      expect(replaceString(str, replace)).toBe(result);
    }
  });
});

describe('transliterate.config()', () => {
  it('should read and reset config', () => {
    tr.config(defaultOptions);
    expect(tr.config()).toEqual(defaultOptions);
    tr.config(undefined, true);
    expect(tr.config()).toEqual({});
  });
});

describe('transliterate.setData()', () => {
  it('should set and reset custom codemap', () => {
    const map = { a: 'A', b: 'B', c: 'C' };
    tr.setData(map);
    expect(tr.setData(map)).toEqual({ ...charmap, ...map });
    expect(tr('abc')).toBe('ABC');
    expect(tr.setData(undefined, true)).toEqual(charmap);
    expect(tr('abc')).toBe('abc');
  });

  it('should only include own properties from data', () => {
    // Create object with inherited property to cover Object.hasOwn branch
    const proto = { inherited: 'value' };
    const map = Object.create(proto) as { [key: string]: string };
    map.a = 'A';
    tr.setData(undefined, true);
    tr.setData(map);
    expect(tr('a')).toBe('A');
    // inherited property should not be added
    expect(tr('inherited')).toBe('inherited');
    tr.setData(undefined, true);
  });
});

describe('formatReplaceOption', () => {
  it('should format replace options correctly', () => {
    const transliterate = new Transliterate({}, charmap);
    const formatReplaceOption =
      transliterate.formatReplaceOption.bind(transliterate);
    const optObj: OptionReplaceObject = { a: 'b', c: 'd' };
    const optArr: OptionReplaceArray = [
      ['a', 'b'],
      ['c', 'd'],
    ];
    expect(formatReplaceOption(optObj)).toEqual(optArr);
    expect(formatReplaceOption(optArr)).toEqual(optArr);
    expect(formatReplaceOption(optArr)).not.toBe(optArr);
  });

  it('should only include own properties', () => {
    const transliterate = new Transliterate({}, charmap);
    const formatReplaceOption =
      transliterate.formatReplaceOption.bind(transliterate);
    // Create object with inherited property
    const proto = { inherited: 'value' };
    const optObj = Object.create(proto) as OptionReplaceObject;
    optObj.own = 'ownValue';
    expect(formatReplaceOption(optObj)).toEqual([['own', 'ownValue']]);
  });
});
