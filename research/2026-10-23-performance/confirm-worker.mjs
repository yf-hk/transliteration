import {createInterface} from 'node:readline';
import {performance} from 'node:perf_hooks';
import {load} from './adapters.mjs';
import {workloads} from './workloads.mjs';

const adapter=JSON.parse(process.argv[2]);
const api=await load(adapter);
process.stdout.write(JSON.stringify({ready:true,id:adapter.id})+'\n');
for await(const line of createInterface({input:process.stdin})) {
  try {
    const request=JSON.parse(line);
    const fn=api[request.mode];
    const texts=request.texts??workloads[request.workload];
    const expected=texts.map(text=>fn(text));
    if(expected.some(value=>typeof value!=='string'))throw new Error('Non-string output');
    let checksum=0;
    function run(count){for(let i=0;i<count;i++){const value=fn(texts[i%texts.length]);checksum=(checksum+value.length+(value.charCodeAt(value.length-1)||0))>>>0;}}
    const warmEnd=performance.now()+(request.warmMs??300);
    let warmCalls=0;
    do {run(32);warmCalls+=32;} while(performance.now()<warmEnd);
    let count=32,elapsed=0;
    do {const t=performance.now();run(count);elapsed=performance.now()-t;if(elapsed<30)count*=2;}while(elapsed<30&&count<2**25);
    count=Math.max(32,Math.min(2**25,Math.ceil(count*request.targetMs/Math.max(elapsed,0.01)/32)*32));
    const cpuBefore=process.cpuUsage(),start=performance.now();
    run(count);
    const elapsedMs=performance.now()-start,cpu=process.cpuUsage(cpuBefore);
    let errors=0;
    for(let i=0;i<texts.length;i++)if(fn(texts[i])!==expected[i])errors++;
    const chars=texts.reduce((n,s)=>n+s.length,0)/texts.length;
    const bytes=texts.reduce((n,s)=>n+Buffer.byteLength(s),0)/texts.length;
    process.stdout.write(JSON.stringify({id:adapter.id,mode:request.mode,workload:request.workload,round:request.round,iterations:count,warmCalls,elapsedMs,cpuMs:(cpu.user+cpu.system)/1000,opsPerSec:count/elapsedMs*1000,charsPerSec:chars*count/elapsedMs*1000,mibPerSec:bytes*count/elapsedMs*1000/2**20,inputCharsPerCall:chars,checksum,errors,outputEmpty:expected.filter(v=>!v).length,sampleInputs:texts.length})+'\n');
  }catch(error){process.stdout.write(JSON.stringify({error:error.stack})+'\n');}
}
