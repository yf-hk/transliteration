import {createRequire} from 'node:module';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {dir,repo} from './adapters.mjs';
import {workloads} from './workloads.mjs';
const require=createRequire(import.meta.url);
const api=require(path.join(repo,'dist/node/src/node/index.js'));
let checksum=0, calls=0;
const end=performance.now()+5000;
while(performance.now()<end) for(const name of ['ascii','latin','chinese','korean','mixed']) for(const input of workloads[name]) {
  checksum+=api.transliterate(input).length+api.slugify(input).length;calls+=2;
}
console.log(JSON.stringify({calls,checksum,profilingOnly:true}));
