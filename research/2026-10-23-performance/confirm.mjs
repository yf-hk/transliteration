import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {adapters,dir,repo} from './adapters.mjs';

const suite=process.argv[2]??'finalists';
const available=[...adapters,...JSON.parse(fs.readFileSync(path.join(dir,'prototype-adapters.json'),'utf8'))];
let specs;
if(suite==='finalists')specs=[
  {id:'current-full',groups:['ascii','latin','cyrillic','chinese','korean','mixed','long']},
  {id:'prototype-packed12-values',groups:['ascii','latin','cyrillic','chinese','korean','mixed','long']},
  {id:'prototype-packed12-linear-spacing',groups:['ascii','latin','cyrillic','chinese','korean','mixed','long']},
  {id:'prototype-packed12-optimized',groups:['chinese','long']},
  {id:'prototype-packed12-codepoints',groups:['latin','korean']},
  {id:'prototype-pooled-offsets-memo',groups:['chinese','mixed']},
  {id:'prototype-packed12-hangul-prefix',groups:['korean']},
];
else if(suite==='scaling')specs=[
  {id:'current-full',groups:['scale-16','scale-64','scale-256','scale-1024']},
  {id:'prototype-packed12-optimized',groups:['scale-16','scale-64','scale-256','scale-1024']},
  {id:'prototype-packed12-linear-spacing',groups:['scale-16','scale-64','scale-256','scale-1024']},
];
else throw new Error('Unknown suite');

const clients=new Map();
async function start(adapter){
  const child=spawn(process.execPath,[path.join(dir,'confirm-worker.mjs'),JSON.stringify(adapter)],{stdio:['pipe','pipe','pipe']});
  let pending,stderr='';
  child.stderr.on('data',data=>stderr+=data);
  const ready=new Promise((resolve,reject)=>{pending={resolve,reject};});
  createInterface({input:child.stdout}).on('line',line=>{const value=JSON.parse(line);const waiter=pending;pending=undefined;if(value.error)waiter?.reject(new Error(value.error));else waiter?.resolve(value);});
  child.on('exit',code=>{if(pending)pending.reject(new Error(`Worker exit ${code}: ${stderr}`));});
  await ready;
  return {process:child,request(value){return new Promise((resolve,reject)=>{if(pending)throw new Error('Concurrent request');pending={resolve,reject};child.stdin.write(JSON.stringify(value)+'\n');});}};
}
const report={owner:'GPT-6 Astra, max effort',suite,startedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),runtime:process.version,versions:process.versions,cpu:os.cpus()[0].model,cpuCount:os.cpus().length,loadStart:os.loadavg(),rounds:5,warmMs:300,targetMs:500,method:'One persistent worker per implementation; only one worker receives work at a time. Each timed job has at least300ms warmup and independent calibration. Five interleaved rounds; imports excluded and measured separately.',results:[]};
const file=path.join(dir,`confirmation-${suite}.json`);
try{
  for(const spec of specs){const adapter=available.find(a=>a.id===spec.id);if(!adapter)throw new Error(`Missing ${spec.id}`);clients.set(spec.id,await start(adapter));}
  const groups=[...new Set(specs.flatMap(s=>s.groups))];
  const jobs=groups.flatMap(workload=>(suite==='scaling'?['transliterate']:['transliterate','slugify']).flatMap(mode=>specs.filter(s=>s.groups.includes(workload)).map(s=>({id:s.id,workload,mode,targetMs:500,warmMs:300,...(suite==='scaling'?{texts:['你好世界北京上海广州深圳'.repeat(Number(workload.slice(6)))]}:{})}))));
  for(let round=0;round<5;round++){
    const offset=Math.floor(jobs.length*round/5),order=[...jobs.slice(offset),...jobs.slice(0,offset)];
    for(const job of order){const value=await clients.get(job.id).request({...job,round});if(value.errors)throw new Error('Output mismatch');report.results.push(value);fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');}
    console.error(`${suite} round ${round+1}/5 (${report.results.length} measurements)`);
  }
  report.endedAt=new Date().toISOString();report.loadEnd=os.loadavg();fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(file);
}finally{for(const client of clients.values())client.process.stdin.end();}
