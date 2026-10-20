import { charmap } from '../../data/charmap';
import { Slugify } from '../common/slugify';
import { Transliterate } from '../common/transliterate';
import type { SlugifyFunction, TransliterateFunction } from '../types';

const t = new Transliterate({}, charmap);
export const transliterate: TransliterateFunction = t.transliterate.bind(
  t
) as TransliterateFunction;
transliterate.config = t.config.bind(t);
transliterate.setData = t.setData.bind(t);

const s = new Slugify({}, charmap);
export const slugify: SlugifyFunction = s.slugify.bind(s) as SlugifyFunction;
slugify.config = s.config.bind(s);
slugify.setData = s.setData.bind(s);
