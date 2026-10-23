import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { adapters, load } from './adapters.mjs';
import { samples, workloads } from './workloads.mjs';

const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const adapter = adapters.find(x => x.id === request.id) ?? request.adapter;
if (!adapter) throw new Error('Unknown adapter');
global.gc?.();
const before = process.memoryUsage();
const start = performance.now();
const api = await load(adapter);
const importMs = performance.now() - start;
const firstStart = performance.now();
const first = api[adapter.modes[0]]('Crème 北京 안녕하세요');
const firstCallMs = performance.now() - firstStart;
global.gc?.();
const afterImport = process.memoryUsage();
if (request.kind === 'memory') {
  let checksum = first.length;
  for (let i = 0; i < 200; i++) for (const f of Object.values(api)) for (const s of workloads.mixed) checksum += f(s).length;
  global.gc?.();
  const afterWarm = process.memoryUsage();
  const difference = (a,b) => Object.fromEntries(Object.keys(a).map(k => [k, a[k]-b[k]]));
  process.stdout.write(JSON.stringify({ id: adapter.id, importMs, firstCallMs, before, afterImport, afterWarm, importDelta: difference(afterImport,before), warmDelta: difference(afterWarm,before), checksum }));
} else if (request.kind === 'outputs') {
  const result = {};
  for (const [mode,fn] of Object.entries(api)) result[mode] = Object.fromEntries(Object.entries(samples).map(([k,s]) => [k,fn(s)]));
  process.stdout.write(JSON.stringify({id:adapter.id,result}));
} else {
  const fn = api[request.mode];
  const texts = workloads[request.workload];
  const expected = texts.map(s => fn(s));
  if (expected.some(s => typeof s !== 'string')) throw new Error('Non-string output');
  let checksum = 0;
  const batch = 32;
  function run(iterations) {
    for (let i = 0; i < iterations; i++) {
      const index = i % texts.length;
      const value = fn(texts[index]);
      checksum = (checksum + value.length + (value.charCodeAt(value.length - 1) || 0)) >>> 0;
    }
  }
  // Warm each function, then calibrate its own batch count outside measurements.
  run(256);
  let count = batch;
  let elapsed = 0;
  do { const t=performance.now();run(count);elapsed=performance.now()-t; if(elapsed<30) count*=2; } while (elapsed < 30 && count < 2**25);
  count = Math.max(batch, Math.min(2**25, Math.ceil(count * request.targetMs / Math.max(elapsed,0.01) / batch) * batch));
  const cpuBefore = process.cpuUsage();
  const t = performance.now();
  run(count);
  const elapsedMs = performance.now()-t;
  const cpu = process.cpuUsage(cpuBefore);
  let errors=0;
  for (let i=0;i<texts.length;i++) if(fn(texts[i])!==expected[i]) errors++;
  const inputChars = count * texts.reduce((n,s)=>n+s.length,0) / texts.length;
  const inputBytes = count * texts.reduce((n,s)=>n+Buffer.byteLength(s),0) / texts.length;
  process.stdout.write(JSON.stringify({id:adapter.id, mode:request.mode, workload:request.workload, iterations:count, elapsedMs, opsPerSec:count/elapsedMs*1000, charsPerSec:inputChars/elapsedMs*1000, mibPerSec:inputBytes/elapsedMs*1000/2**20, cpuMs:(cpu.user+cpu.system)/1000, checksum, errors, outputEmpty:expected.filter(x=>!x).length, sampleInputs:texts.length, inputCharsPerCall:inputChars/count}));
}
