import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {adapters,dir,load} from './adapters.mjs';
const compact=JSON.parse(fs.readFileSync(path.join(dir,'prototype-adapters.json'),'utf8'));
const ids=process.env.MEMORY_IDS?.split(',')??['current-full','prototype-packed12-values','prototype-packed12-linear-spacing'];
if(process.argv[2]==='worker') {
  const request=JSON.parse(fs.readFileSync(0,'utf8'));
  global.gc();global.gc();const before=process.memoryUsage();
  const api=await load(request.adapter);
  api.transliterate('Hello 北京 안녕하세요');
  global.gc();global.gc();const warm=process.memoryUsage();
  const t=performance.now();
  const live=request.scenario==='expose'?api.transliterate.setData():api.transliterate.setData({x:'X'});
  const materializeMs=performance.now()-t;
  global.gc();global.gc();const after=process.memoryUsage();
  const keyCount=Object.keys(live).length;
  const report={id:request.adapter.id,scenario:request.scenario,materializeMs,keyCount,before,warm,after,heapExternalDelta:after.heapUsed+after.external-before.heapUsed-before.external};
  console.log(JSON.stringify(report));
} else {
  const results=[];
  for(let round=0;round<5;round++) for(const scenario of ['expose','custom']) for(const id of [...ids.slice(round%ids.length),...ids.slice(0,round%ids.length)]) {
    const adapter=[...adapters,...compact].find(a=>a.id===id);
    const p=spawnSync(process.execPath,['--expose-gc',import.meta.filename,'worker'],{input:JSON.stringify({adapter,scenario}),encoding:'utf8',timeout:120000});
    if(p.status!==0)throw new Error(p.stderr||String(p.error));
    results.push({...JSON.parse(p.stdout),round});
  }
  const file=process.env.MEMORY_OUTPUT??'memory-scenarios.json';fs.writeFileSync(path.join(dir,file),JSON.stringify({runtime:process.version,results},null,2)+'\n');
  console.log(file+' complete');
}
