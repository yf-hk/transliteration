import { performance } from 'node:perf_hooks';
import { Session } from 'node:inspector';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { adapters, directory, loadAdapter, resolveAdapter } from './adapters.mjs';
import { fixtures } from '../../benchmark/fixtures.mjs';

const adapter = adapters.find(item => item.id === process.argv[2]);
const api = await loadAdapter(adapter, resolveAdapter(adapter).entry);
const inputs = fixtures.filter(item => ['ascii','latin'].includes(item.id)).flatMap(item => item.texts);
let checksum = 0;
function batch() {
  for (const input of inputs) { const output = api.methods.slugify(input); checksum += output.length; }
}
const warmEnd = performance.now()+300;
while (performance.now()<warmEnd) batch();
const session = new Session();
session.connect();
const post = (method,params={}) => new Promise((resolve,reject) => session.post(method,params,(error,value) => error ? reject(error) : resolve(value)));
await post('Profiler.enable');
await post('Profiler.start');
const end = performance.now()+2000;
while (performance.now()<end) batch();
const {profile} = await post('Profiler.stop');
session.disconnect();
writeFileSync(path.join(directory,`${adapter.id}.cpuprofile`),JSON.stringify(profile));
console.log(`${adapter.id}: consumed checksum ${checksum}`);
