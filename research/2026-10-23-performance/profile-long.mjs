import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {adapters,dir,load} from './adapters.mjs';
const all=[...adapters,...JSON.parse(fs.readFileSync(path.join(dir,'prototype-adapters.json'),'utf8'))];
const api=await load(all.find(a=>a.id===(process.argv[2]??'current-full')));
const input='你好世界北京上海广州深圳'.repeat(512);
let calls=0,checksum=0;
const end=performance.now()+3000;
while(performance.now()<end){const value=api.transliterate(input);checksum+=value.length+value.charCodeAt(value.length-1);calls++;}
console.log(JSON.stringify({profilingOnly:true,calls,checksum,inputChars:input.length}));
