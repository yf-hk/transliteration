import type { OptionsSlugify } from '../types';
import {
  defaultOptions as defaultOptionsTransliterate,
  Transliterate,
} from './transliterate';
import { deepClone, escapeRegExp, regexpReplaceCustom } from './utils';

// Slugify
export const defaultOptions: OptionsSlugify = {
  ...deepClone(defaultOptionsTransliterate),
  allowedChars: 'a-zA-Z0-9-_.~',
  lowercase: true,
  separator: '-',
  uppercase: false,
  fixChineseSpacing: true,
};

export class Slugify extends Transliterate {
  get options(): OptionsSlugify {
    return deepClone({ ...defaultOptions, ...this.confOptions });
  }

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
    const opt: OptionsSlugify = deepClone({ ...this.options, ...opts });

    // remove leading and trailing separators
    const sep: string = opt.separator ? escapeRegExp(opt.separator) : '';

    let slug: string = this.transliterate(str, opt);

    slug = regexpReplaceCustom(
      slug,
      new RegExp(`[^${opt.allowedChars}]+`, 'g'),
      opt.separator ?? '-',
      opt.ignore ?? []
    );
    if (sep) {
      // Collapse consecutive separators into one
      slug = slug.replace(new RegExp(`${sep}+`, 'g'), opt.separator as string);
      // Remove leading and trailing separators
      slug = slug.replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '');
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
