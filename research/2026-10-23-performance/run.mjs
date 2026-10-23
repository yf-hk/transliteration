import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execFileSync } from 'node:child_process';
import { adapters, dir, repo } from './adapters.mjs';

const kind=process.argv[2] ?? 'benchmark';
const subset=process.argv[3]?.split(',');
const selected=adapters.filter(a => !subset || subset.includes(a.id));
const extra=path.join(dir,'prototype-adapters.json');
if(fs.existsSync(extra)) selected.push(...JSON.parse(fs.readFileSync(extra,'utf8')).filter(a=>!subset || subset.includes(a.id)));
const rounds=Number(process.env.BENCH_ROUNDS ?? 5);
const targetMs=Number(process.env.BENCH_TARGET_MS ?? 120);
const groups=process.env.BENCH_GROUPS?.split(',') ?? ['ascii','latin','cyrillic','chinese','korean','mixed','long'];
const jobs = kind==='benchmark' ? groups.flatMap(workload=>['transliterate','slugify'].flatMap(mode=>selected.filter(a=>a.modes.includes(mode)).map(a=>({id:a.id,adapter:a,mode,workload,kind,targetMs})))) : selected.map(a=>({id:a.id,adapter:a,kind}));
const output=path.join(dir,`${kind}-${Date.now()}.json`);
const actualRounds=kind==='outputs'?1:rounds;
const report={startedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),runtime:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,cpuCount:os.cpus().length,loadStart:os.loadavg(),rounds:actualRounds,targetMs,kind,results:[]};
for(let round=0;round<actualRounds;round++) {
  // Rotate the complete job order between rounds so neither implementation always runs first.
  const offset=Math.floor(jobs.length*round/rounds);
  const order=[...jobs.slice(offset),...jobs.slice(0,offset)];
  for(const job of order) {
    const p=spawnSync(process.execPath,['--expose-gc',path.join(dir,process.env.BENCH_WORKER??'worker.mjs')],{input:JSON.stringify(job),encoding:'utf8',timeout:120000,maxBuffer:2**22});
    if(p.status!==0) throw new Error(`${job.id} ${job.mode} ${job.workload}: ${p.stderr || p.error}`);
    report.results.push({...JSON.parse(p.stdout),round});
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  }
  process.stderr.write(`${kind} round ${round+1}/${actualRounds} complete (${report.results.length} measurements)\n`);
}
report.endedAt=new Date().toISOString();report.loadEnd=os.loadavg();
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(dir,`${kind}-latest.json`),JSON.stringify(report,null,2)+'\n');
console.log(output);
