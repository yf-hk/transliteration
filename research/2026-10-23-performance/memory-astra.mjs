import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {adapters,dir,load} from './adapters.mjs';
import {workloads} from './workloads.mjs';
if(process.argv[2]==='worker'){
  const request=JSON.parse(fs.readFileSync(0,'utf8'));
  global.gc();global.gc();const before=process.memoryUsage();
  const t=performance.now();const api=await load(request.adapter);const importMs=performance.now()-t;
  global.gc();global.gc();const afterImport=process.memoryUsage();
  const firstStart=performance.now();const first=api[request.adapter.modes[0]]('Crème 北京 안녕하세요');const firstCallMs=performance.now()-firstStart;
  global.gc();global.gc();const afterFirst=process.memoryUsage();
  let checksum=first.length;
  for(let i=0;i<200;i++)for(const fn of Object.values(api))for(const text of workloads.mixed)checksum+=fn(text).length;
  global.gc();global.gc();const afterWarm=process.memoryUsage();
  const difference=value=>Object.fromEntries(Object.keys(before).map(key=>[key,value[key]-before[key]]));
  console.log(JSON.stringify({id:request.adapter.id,importMs,firstCallMs,before,afterImport,afterFirst,afterWarm,importDelta:difference(afterImport),firstDelta:difference(afterFirst),warmDelta:difference(afterWarm),checksum}));
}else{
  const all=[...adapters,...JSON.parse(fs.readFileSync(path.join(dir,'prototype-adapters.json'),'utf8'))];
  const ids=['current-full','current-latin','any-ascii','sindre-transliterate','unidecode','simov-slugify','slug','limax','prototype-pages','prototype-pooled-offsets','prototype-pooled-offsets-memo','prototype-packed12-values','prototype-packed12-linear-spacing'];
  const report={owner:'GPT-6 Astra, max effort',runtime:process.version,startedAt:new Date().toISOString(),rounds:5,loadStart:os.loadavg(),method:'Fresh process per sample; import timed before first API call; two explicit GCs before each memory snapshot; 200 mixed-workload passes for warm state. OS file cache is not flushed.',results:[]};
  for(let round=0;round<5;round++)for(const id of [...ids.slice(round%ids.length),...ids.slice(0,round%ids.length)]){
    const adapter=all.find(a=>a.id===id);
    const child=spawnSync(process.execPath,['--expose-gc',import.meta.filename,'worker'],{input:JSON.stringify({adapter}),encoding:'utf8',timeout:120000,maxBuffer:2**22});
    if(child.status!==0)throw new Error(child.stderr||String(child.error));
    report.results.push({...JSON.parse(child.stdout),round});
    fs.writeFileSync(path.join(dir,'memory-astra.json'),JSON.stringify(report,null,2)+'\n');
  }
  report.endedAt=new Date().toISOString();report.loadEnd=os.loadavg();fs.writeFileSync(path.join(dir,'memory-astra.json'),JSON.stringify(report,null,2)+'\n');console.log('memory-astra.json complete');
}
