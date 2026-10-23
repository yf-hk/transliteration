import { expect, it } from 'bun:test';
import { slugify, transliterate } from '../node';
import type { OptionReplaceArray } from '../types';

for (const [name, convert] of Object.entries({ transliterate, slugify })) {
  it(`${name} snapshots per-call options before coercing the input`, () => {
    const options = { ignore: ['!'], replace: { x: 'before' } };
    const source = {
      toString() {
        options.ignore.length = 0;
        options.replace.x = 'after';
        return 'x!';
      },
    };
    expect(Reflect.apply(convert, undefined, [source, options])).toBe(
      'before!'
    );
    expect(options.replace.x).toBe('after');
  });

  it(`${name} snapshots live configuration for each call`, () => {
    const ignore = ['!'];
    const replace = { x: 'before' };
    convert.config({ ignore, replace });
    const live = convert.config();
    const source = {
      toString() {
        Object.assign(live, { ignore: [], replace: { x: 'after' } });
        return 'x!';
      },
    };
    try {
      expect(Reflect.apply(convert, undefined, [source])).toBe('before!');
      expect(convert('x')).toBe('after');
      expect(ignore).toEqual(['!']);
      expect(replace).toEqual({ x: 'before' });
    } finally {
      convert.config(undefined, true);
    }
  });

  it(`${name} leaves caller replacement rules unchanged`, () => {
    const pattern = /a/g;
    pattern.lastIndex = 1;
    const replace: OptionReplaceArray = [[pattern, 'X']];
    Object.freeze(replace[0]);
    Object.freeze(replace);
    expect(convert('aba', { replace, lowercase: false })).toBe('XbX');
    expect(pattern.lastIndex).toBe(1);
  });

  it(`${name} snapshots nested rules while using a map changed during coercion`, () => {
    const replaceAfter: OptionReplaceArray = [['Mapped', 'snapshot']];
    const options = { replaceAfter };
    const source = {
      toString() {
        replaceAfter[0][1] = 'changed';
        replaceAfter.push(['snapshot', 'late']);
        convert.config({ replaceAfter: [['Mapped', 'configured']] });
        convert.setData({ x: 'Mapped' });
        return 'x';
      },
    };
    try {
      expect(Reflect.apply(convert, undefined, [source, options])).toBe(
        'snapshot'
      );
      expect(convert('x')).toBe('configured');
      expect(replaceAfter).toHaveLength(2);
    } finally {
      convert.config(undefined, true);
      convert.setData(undefined, true);
    }
  });
}
