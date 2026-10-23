import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {dir} from './adapters.mjs';
import {workloads} from './workloads.mjs';
const runtime=process.argv[2]??'python';
const ids=runtime==='python'?['python-unidecode','python-text-unidecode','python-anyascii','python-slugify']:['rust-deunicode','rust-anyascii'];
const jobs=Object.entries(workloads).flatMap(([workload,texts])=>ids.map(id=>({id,workload,texts,targetMs:120})));
const results=[];
const start=new Date().toISOString();
for(let round=0;round<5;round++) {
  const offset=round%ids.length;
  const order=[...jobs.slice(offset),...jobs.slice(0,offset)];
  for(const job of order) {
    const command=runtime==='python'?path.join(dir,'python/.venv/bin/python'):path.join(dir,'rust/target/release/transliteration-compare');
    const args=runtime==='python'?[path.join(dir,'python/worker.py')]:[];
    const p=spawnSync(command,args,{input:JSON.stringify(job),encoding:'utf8',timeout:120000,maxBuffer:2**22});
    if(p.status!==0)throw new Error(`${job.id}: ${p.stderr||p.error}`);
    results.push({...JSON.parse(p.stdout),round});
  }
  process.stderr.write(`${runtime} round ${round+1}/5 complete\n`);
}
const report={startedAt:start,endedAt:new Date().toISOString(),rounds:5,targetMs:120,results};
fs.writeFileSync(path.join(dir,`${runtime}-benchmark.json`),JSON.stringify(report,null,2)+'\n');
console.log(path.join(dir,`${runtime}-benchmark.json`));
