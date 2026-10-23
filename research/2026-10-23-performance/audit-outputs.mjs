import fs from 'node:fs';
import path from 'node:path';
import {adapters,dir,load} from './adapters.mjs';
import {workloads,samples} from './workloads.mjs';
const current=await load(adapters.find(a=>a.id==='current-full'));
const results=[];
for(const adapter of adapters){const api=await load(adapter);const result={id:adapter.id,modes:{}};for(const [mode,fn]of Object.entries(api)){const outputs=Object.fromEntries(Object.entries(samples).map(([key,value])=>[key,fn(value)]));const controls=workloads.ascii.map(input=>({input,output:fn(input),current:current[mode](input)}));result.modes[mode]={samples:outputs,asciiControls:controls,asciiEqualToCurrent:controls.every(x=>x.output===x.current),emptySampleKeys:Object.keys(outputs).filter(key=>!outputs[key]),nonAsciiSampleKeys:Object.keys(outputs).filter(key=>/[^\x00-\x7f]/.test(outputs[key]))};}results.push(result);}
fs.writeFileSync(path.join(dir,'outputs-astra.json'),JSON.stringify({owner:'GPT-6 Astra, max effort',runtime:process.version,measuredAt:new Date().toISOString(),scope:'Observed fixtures and exact-output ASCII controls, not a language-wide accuracy score.',results},null,2)+'\n');console.log(results.map(r=>({id:r.id,asciiMatches:Object.fromEntries(Object.entries(r.modes).map(([k,v])=>[k,v.asciiEqualToCurrent]))})));
