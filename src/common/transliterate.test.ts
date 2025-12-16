/**
 * Tests are taken from Text-Unidecode-0.04/test.pl
 *
 * @see <http://search.cpan.org/~sburke/Text-Unidecode-0.04/lib/Text/Unidecode.pm>
 */
import { describe, expect, it } from 'vitest';
import { charmap } from '../../data/charmap';
import { transliterate as tr } from '../node';
import type {
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
      expect(tr('你好123世界')).toBe('Ni Hao 123Shi Jie');
      expect(tr('2024年')).toBe('2024Nian');
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
    it('should add spaces between Chinese characters by default', () => {
      expect(tr('你好')).toBe('Ni Hao');
      expect(tr('北京市')).toBe('Bei Jing Shi');
    });

    it('should not add extra spaces around punctuation', () => {
      expect(tr('你好，世界')).toBe('Ni Hao,Shi Jie');
    });

    it('should handle fixChineseSpacing option', () => {
      expect(tr('你好', { fixChineseSpacing: false })).toBe('NiHao');
      expect(tr('你好', { fixChineseSpacing: true })).toBe('Ni Hao');
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
    const transliterate = new Transliterate();
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
    const transliterate = new Transliterate();
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
    const transliterate = new Transliterate();
    const formatReplaceOption =
      transliterate.formatReplaceOption.bind(transliterate);
    // Create object with inherited property
    const proto = { inherited: 'value' };
    const optObj = Object.create(proto) as OptionReplaceObject;
    optObj.own = 'ownValue';
    expect(formatReplaceOption(optObj)).toEqual([['own', 'ownValue']]);
  });
});
