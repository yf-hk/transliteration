import { slugify, transliterate } from 'transliteration';
import {
  slugify as latinSlugify,
  transliterate as latinTransliterate,
} from 'transliteration/latin';

for (const convert of [transliterate, latinTransliterate]) {
  const result: string = convert('Crème 世界', {
    unknown: '?',
    ignore: ['世界'],
    replace: [[/Crème/g, 'Cafe']],
    replaceAfter: { Cafe: 'Coffee' },
    trim: true,
    fixChineseSpacing: false,
  });
  const data: Record<string, string> = convert.setData({ '🚀': 'rocket' });
  convert(result, convert.config({ unknown: data['🚀'] }, true));
  convert.setData({}, true);
}

for (const convert of [slugify, latinSlugify]) {
  const result: string = convert('Crème 世界', {
    separator: '_',
    uppercase: true,
    lowercase: false,
    allowedChars: 'a-zA-Z0-9_',
  });
  convert(result, convert.config({}, true));
  convert.setData({}, true);
}
