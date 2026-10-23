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
