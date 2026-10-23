import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { fixtures } from '../../benchmark/fixtures.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const require = createRequire(import.meta.url);
const files = { before: path.join(directory, 'before-dist/node/src/node/index.js'), after: path.join(root, 'dist/node/src/node/index.js') };
const apis = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, require(file)]));
const report = { runtime: process.version, cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, loadBefore: os.loadavg(), protocol: {rounds: 5, targetMs: 100, warmupMs: 100, alternate: true}, outputChecks: 0, timedCalls: 0, failures: [], samples: [], hashes: Object.fromEntries(Object.entries(files).map(([name, file]) => [name, createHash('sha256').update(readFileSync(file)).digest('hex')])) };
const cases = [
  ...[1024,4096,16384].map(count => ({id:`ignored-${count}`,mode:'transliterate',spans:count,texts:['你é '.repeat(count)],options:{ignore:['你']}})),
  ...fixtures.filter(fixture=>['ascii','latin'].includes(fixture.id)).map(fixture=>({id:fixture.id,mode:'slugify',texts:fixture.texts})),
];
let sink = 0;
function runCase(convert, fixture, iterations, expected) {
  const started = performance.now();
  let outputUnits = 0;
  for (let i=0; i<iterations; i++) {
    const index = i % fixture.texts.length;
    const output = convert(fixture.texts[index], fixture.options);
    if (output.length !== expected[index].length) throw new Error(`${fixture.id}: output length mismatch`);
    outputUnits += output.length;
    sink = (sink + output.length + output.charCodeAt(0) + output.charCodeAt(output.length-1)) >>> 0;
  }
  return {elapsedMs:performance.now()-started, completedCalls:iterations, outputUnits, errors:0};
}
for (const fixture of cases) {
  const expected = fixture.texts.map(text => apis.before[fixture.mode](text,fixture.options));
  if (fixture.spans) assert.equal(expected[0], '你 e '.repeat(fixture.spans));
  for (const [name,api] of Object.entries(apis)) {
    for (let i=0;i<fixture.texts.length;i++) { assert.equal(api[fixture.mode](fixture.texts[i],fixture.options),expected[i]); report.outputChecks++; }
  }
  const counts = {};
  for (const [name,api] of Object.entries(apis)) {
    const convert=api[fixture.mode];
    const until=performance.now()+report.protocol.warmupMs;
    do { runCase(convert,fixture,fixture.spans ? 1 : fixture.texts.length,expected); } while(performance.now()<until);
    let calls=fixture.spans ? 1 : fixture.texts.length;
    let calibrated;
    do { calibrated=runCase(convert,fixture,calls,expected); if (calibrated.elapsedMs < 10) calls*=2; } while(calibrated.elapsedMs<10);
    counts[name]=Math.max(1,Math.ceil(calls*report.protocol.targetMs/calibrated.elapsedMs));
  }
  for(let round=0;round<report.protocol.rounds;round++) {
    for(const name of round%2 ? ['after','before'] : ['before','after']) {
      const sample=runCase(apis[name][fixture.mode],fixture,counts[name],expected);
      report.timedCalls += sample.completedCalls;
      report.samples.push({fixture:fixture.id,name,round,spans:fixture.spans,...sample,msPerCall:sample.elapsedMs/sample.completedCalls});
    }
  }
}
report.summary=cases.map(fixture=>({fixture:fixture.id,spans:fixture.spans,...Object.fromEntries(['before','after'].map(name=>{const samples=report.samples.filter(item=>item.fixture===fixture.id&&item.name===name).map(item=>item.msPerCall).sort((a,b)=>a-b);return [name,{medianMs:samples[2],minMs:samples[0],maxMs:samples.at(-1)}];}))}));
report.footprint=['index','latin'].map(name=>{const entries={before:path.join(directory,`before-dist/node/src/node/${name}.js`),after:path.join(root,`dist/node/src/node/${name}.js`)};return {name,...Object.fromEntries(Object.entries(entries).map(([side,file])=>{const bytes=readFileSync(file);return [side,{raw:bytes.length,gzip:gzipSync(bytes,{level:9}).length}];}))};});
report.loadAfter=os.loadavg(); report.sink=sink;
writeFileSync(path.join(directory,'measurements.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summary:report.summary,footprint:report.footprint,outputChecks:report.outputChecks,timedCalls:report.timedCalls,failures:report.failures},null,2));
