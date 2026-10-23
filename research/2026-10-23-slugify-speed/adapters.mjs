import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const directory = path.dirname(fileURLToPath(import.meta.url));
export const repository = path.resolve(directory, '../..');
export const adapters = [
  { id: 'ours-current', entry: 'dist/node/src/node/index.js', manifest: 'package.json', localExport: true, modes: ['slugify'], options: 'Defaults; full map' },
  { id: 'slugify', entry: 'benchmark/node_modules/slugify/slugify.js', manifest: 'benchmark/node_modules/slugify/package.json', localExport: true, modes: ['slugify'], options: '{lower:true, strict:true}' },
  { id: 'ours-prototype', entry: 'research/2026-10-23-performance/prototypes/packed12-linear-spacing.cjs', manifest: 'package.json', localExport: true, modes: ['slugify'], options: 'Existing combined prototype; same public behavior' },
];

export function resolveAdapter(adapter) {
  const packageFile = path.join(repository, adapter.manifest);
  return { entry: path.join(repository, adapter.entry), packageFile, metadata: JSON.parse(readFileSync(packageFile, 'utf8')) };
}

export async function loadAdapter(adapter, entry) {
  const module = await import(pathToFileURL(entry).href);
  return { methods: { slugify: adapter.id === 'slugify' ? text => module.default(text, {lower: true, strict: true}) : (module.slugify ? module : module.default).slugify } };
}
