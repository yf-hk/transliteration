import { OptionsSlugify } from '../types';
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
  public config(options?: OptionsSlugify, reset = false): OptionsSlugify {
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
  public slugify(str: string, options?: OptionsSlugify): string {
    options = typeof options === 'object' ? options : {};
    const opt: OptionsSlugify = deepClone({ ...this.options, ...options });

    // remove leading and trailing separators
    const sep: string = opt.separator ? escapeRegExp(opt.separator) : '';

    let slug: string = this.transliterate(str, opt);

    slug = regexpReplaceCustom(
      slug,
      RegExp(`[^${opt.allowedChars}]+`, 'g'),
      opt.separator!,
      opt.ignore!,
    );
    if (sep) {
      slug = slug.replace(RegExp(`${sep}+|${sep}$`, 'g'), '');
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
