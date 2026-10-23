import { directory, repository } from './adapters.mjs';
export { directory, repository, resolveAdapter } from './adapters.mjs';
import { pathToFileURL } from 'node:url';
const configurations = [
  { id: 'default', options: undefined, description: 'Default options', expectedAscii: 'hello-world-123' },
  { id: 'custom', options: {separator:'__',ignore:['SKU12'],replace:[['Café','Coffee']],replaceAfter:[[/Cafe/g,'coffee$&']]}, description: 'Custom separator, ignore, literal-$ regex replacement', expectedAscii: 'hello__world__123' },
];
export const adapters = configurations.flatMap(config => ['before','after'].map(side => ({id:`${config.id}-${side}`,scenario:config.id,entry:`research/2026-10-23-slugify-minimal/${side === 'before' ? 'before-dist' : 'candidate-final-dist'}/node/src/node/index.js`,manifest:'package.json',localExport:true,modes:['slugify'],options:config.description,callOptions:config.options,expectedAscii:config.expectedAscii})));
export async function loadAdapter(adapter, entry) {
  const api = await import(pathToFileURL(entry).href);
  const convert = (api.slugify ? api : api.default).slugify;
  return {methods: {slugify: text => convert(text, adapter.callOptions)}};
}
