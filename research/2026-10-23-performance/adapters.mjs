import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const dir = path.dirname(fileURLToPath(import.meta.url));
export const repo = path.resolve(dir, '../..');
const require = createRequire(path.join(dir, 'deps/package.json'));
export const adapters = [
  { id: 'current-full', module: path.join(repo, 'dist/node/src/node/index.js'), package: null, modes: ['transliterate', 'slugify'] },
  { id: 'current-latin', module: path.join(repo, 'dist/node/src/node/latin.js'), package: null, modes: ['transliterate', 'slugify'] },
  { id: 'published-full', package: 'transliteration', modes: ['transliterate', 'slugify'] },
  { id: 'any-ascii', package: 'any-ascii', modes: ['transliterate'] },
  { id: 'sindre-transliterate', package: '@sindresorhus/transliterate', modes: ['transliterate'] },
  { id: 'unidecode', package: 'unidecode', modes: ['transliterate'] },
  { id: 'simov-slugify', package: 'slugify', modes: ['slugify'] },
  { id: 'slug', package: 'slug', modes: ['slugify'] },
  { id: 'speakingurl', package: 'speakingurl', modes: ['slugify'] },
  { id: 'limax', package: 'limax', modes: ['slugify'] },
  { id: 'sindre-slugify', package: '@sindresorhus/slugify', modes: ['slugify'] },
];
export function entry(adapter) { return adapter.module ?? require.resolve(adapter.package); }
export async function load(adapter) {
  const loaded = await import(entry(adapter));
  const api = loaded.transliterate ? loaded : loaded.default;
  if (adapter.id === 'current-full' || adapter.id === 'current-latin' || adapter.id === 'published-full' || adapter.id.startsWith('prototype-')) {
    return { transliterate: api.transliterate, slugify: api.slugify };
  }
  if (adapter.id === 'simov-slugify') return { slugify: s => api(s, { lower: true, strict: true }) };
  return { [adapter.modes[0]]: typeof api === 'function' ? api : loaded.default };
}
