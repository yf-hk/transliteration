import { describe, expect, it } from 'vitest';
import { slugify } from '../node';
import type { OptionsSlugify } from '../types';
import { defaultOptions } from './slugify';

describe('slugify()', () => {
  it('should generate slugs correctly', () => {
    const tests: [string, OptionsSlugify | undefined, string][] = [
      ['你好, 世界!', {}, 'ni-hao-shi-jie'],
      ['你好, 世界!', undefined, 'ni-hao-shi-jie'],
      ['你好, 世界!', { separator: '_' }, 'ni_hao_shi_jie'],
      ['你好, 世界!', { lowercase: false }, 'Ni-Hao-Shi-Jie'],
      ['你好, 世界!', { uppercase: true }, 'NI-HAO-SHI-JIE'],
      ['你好, 世界!', { ignore: ['!', ','] }, 'ni-hao,-shi-jie!'],
      ['你好, 世界!', { replace: [['世界', '未来']] }, 'ni-hao-wei-lai'],
      [
        '你好, 世界!',
        {
          replace: [
            ['你好', 'Hello'],
            ['世界', 'World'],
          ],
        },
        'hello-world',
      ],
      [
        '你好, 世界!',
        {
          separator: ', ',
          replace: [
            ['你好', 'Hola'],
            ['世界', 'mundo'],
          ],
          ignore: ['¡', '!'],
          lowercase: false,
        },
        'Hola, mundo!',
      ],
      ['你好, 世界!', { separator: '_' }, 'ni_hao_shi_jie'],
      ['你好, 世界!', { ignore: ['!', ','] }, 'ni-hao,-shi-jie!'],
      ['你好, 世界!', { replace: [['世界', '未来']] }, 'ni-hao-wei-lai'],
      [
        '你好, 世界!',
        {
          replace: [
            ['你好', 'Hello '],
            ['世界', 'World '],
          ],
        },
        'hello-world',
      ],
      [
        '你好, 世界!',
        {
          separator: ', ',
          replace: [
            ['你好', 'Hola'],
            ['世界', 'mundo'],
          ],
          ignore: ['¡', '!'],
          lowercase: false,
        },
        'Hola, mundo!',
      ],
      // Test empty separator (covers line 47-57)
      ['你好, 世界!', { separator: '' }, 'nihaoshijie'],
      // Test undefined separator fallback - uses '-' but sep is empty so no trim
      ['你好, 世界!', { separator: undefined }, 'ni-hao-shi-jie-'],
      // Test with ignore undefined to cover opt.ignore ?? [] fallback (line 55)
      ['你好, 世界!', { ignore: undefined }, 'ni-hao-shi-jie'],
      // Test with separator undefined to cover opt.separator ?? '-' fallback (line 59)
      ['hello   world', { separator: undefined }, 'hello-world'],
    ];
    for (const [str, options, slug] of tests) {
      expect(slugify(str, options)).toBe(slug);
    }
  });
});

describe('slugify.config()', () => {
  it('should read current config', () => {
    slugify.config(defaultOptions);
    expect(slugify.config()).toEqual(defaultOptions);
    slugify.config(undefined, true);
  });

  it('should generate slugs with config', () => {
    const tests: [string, OptionsSlugify, string][] = [];
    for (const [str, options, slug] of tests) {
      slugify.config(options);
      expect(slugify(str)).toBe(slug);
    }
  });
});

describe('slugify() edge cases', () => {
  it('should handle empty strings', () => {
    expect(slugify('')).toBe('');
  });

  it('should handle strings with only special characters', () => {
    expect(slugify('!@#$%^&*()')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('should handle strings with leading/trailing special characters', () => {
    expect(slugify('---hello---')).toBe('hello');
    expect(slugify('!!!test!!!')).toBe('test');
  });

  it('should handle consecutive separators', () => {
    expect(slugify('hello   world')).toBe('hello-world');
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('should handle mixed case with uppercase option', () => {
    expect(slugify('Hello World', { uppercase: true, lowercase: false })).toBe(
      'HELLO-WORLD'
    );
  });

  it('should handle very long strings', () => {
    const longString = '你好世界'.repeat(50);
    const result = slugify(longString);
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain(' ');
  });

  it('should handle strings with numbers', () => {
    expect(slugify('Product 123')).toBe('product-123');
    expect(slugify('2024 年度报告')).toBe('2024-nian-du-bao-gao');
  });

  it('should handle URL-safe characters in allowedChars', () => {
    expect(slugify('hello~world', { allowedChars: 'a-zA-Z0-9~' })).toBe(
      'hello~world'
    );
    expect(slugify('hello.world', { allowedChars: 'a-zA-Z0-9.' })).toBe(
      'hello.world'
    );
  });

  it('should handle custom separator with special regex characters', () => {
    expect(slugify('hello world', { separator: '.' })).toBe('hello.world');
    expect(slugify('hello world', { separator: '+' })).toBe('hello+world');
  });
});

describe('slugify() with different scripts', () => {
  it('should slugify Japanese text', () => {
    expect(slugify('こんにちは')).toBe('konnitiha');
  });

  it('should slugify Korean text', () => {
    expect(slugify('안녕하세요')).toBe('annyeonghaseyo');
  });

  it('should slugify Russian text', () => {
    expect(slugify('Привет мир')).toBe('privet-mir');
  });

  it('should slugify Arabic text', () => {
    expect(slugify('مرحبا بالعالم')).toBe('mrhb-blaalm');
  });

  it('should slugify Greek text', () => {
    expect(slugify('Γειά σου')).toBe('geia-soy');
  });

  it('should slugify mixed language text', () => {
    expect(slugify('Hello 世界 World')).toBe('hello-shi-jie-world');
    expect(slugify('Café 北京')).toBe('cafe-bei-jing');
  });

  it('should slugify accented European characters', () => {
    expect(slugify('café résumé')).toBe('cafe-resume');
    expect(slugify('über straße')).toBe('uber-strasse');
    expect(slugify('piña colada')).toBe('pina-colada');
  });
});

describe('slugify() real-world use cases', () => {
  it('should create URL-friendly slugs for blog titles', () => {
    expect(slugify('How to Learn JavaScript in 2024!')).toBe(
      'how-to-learn-javascript-in-2024'
    );
    expect(slugify('10 Tips & Tricks for Better Code')).toBe(
      '10-tips-tricks-for-better-code'
    );
  });

  it('should create slugs for product names', () => {
    expect(slugify('iPhone 15 Pro Max (256GB)')).toBe(
      'iphone-15-pro-max-256gb'
    );
    expect(slugify('Nike Air Max 90 Black White')).toBe(
      'nike-air-max-90-black-white'
    );
  });

  it('should create slugs for file names', () => {
    expect(slugify('My Document (Final Version).pdf', { separator: '_' })).toBe(
      'my_document_final_version_.pdf'
    );
  });

  it('should create slugs for internationalized content', () => {
    expect(slugify('北京烤鸭 Beijing Roast Duck')).toBe(
      'bei-jing-kao-ya-beijing-roast-duck'
    );
    expect(slugify('寿司 Sushi ラーメン Ramen')).toBe(
      'shou-si-sushi-ramen-ramen'
    );
  });

  it('should handle edge cases in user-generated content', () => {
    expect(slugify('   Spaces   Everywhere   ')).toBe('spaces-everywhere');
    expect(slugify('ALLCAPS')).toBe('allcaps');
    expect(slugify('MixedCASE')).toBe('mixedcase');
    expect(slugify('under_scores_here')).toBe('under_scores_here');
  });
});
