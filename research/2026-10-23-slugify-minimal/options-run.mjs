import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { adapters, directory } from './options-adapters.mjs';
import { startWorker } from './process.mjs';

const protocol = { rounds: 5, warmupMs: 150, calibrationMs: 25, targetMs: 350 };
const result = { startedAt: new Date().toISOString(), runtime: process.version, platform: `${process.platform}/${process.arch}`, cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, loadBefore: os.loadavg(), protocol, adapters: [], audits: [], samples: [], failures: [] };
const workers = new Map();
const fixtures = ['latin', 'long'];
try {
  for (const adapter of adapters) {
    const worker = await startWorker(adapter, './options-worker.mjs');
    workers.set(adapter.id, worker);
    result.adapters.push(worker.metadata);
    result.audits.push({ adapter: adapter.id, fixtures: await worker.request('audit', {fixtures}) });
  }
  for (const id of fixtures) {
    const outputs = result.audits.map(audit => audit.fixtures.find(item => item.fixture === id).outputs.map(item => item.output));
    for (let i = 0; i < outputs.length; i += 2) assert.deepEqual(outputs[i + 1], outputs[i], `${id}: comparison outputs differ`);
  }
  result.exactOutputEquality = true;
  for (let round = 0; round < protocol.rounds; round++) {
    for (const [fixtureIndex, fixture] of fixtures.entries()) {
      const offset = (round + fixtureIndex) % adapters.length;
      const order = [...adapters.slice(offset), ...adapters.slice(0, offset)];
      for (const adapter of order) {
        const sample = await workers.get(adapter.id).request('sample', { mode: 'slugify', fixture, protocol });
        result.samples.push({ adapter: adapter.id, round, ...sample });
      }
    }
    console.log(`Completed round ${round + 1}/${protocol.rounds}`);
  }
} catch (error) {
  result.failures.push({ message: error.message, stack: error.stack });
  process.exitCode = 1;
} finally {
  for (const worker of workers.values()) await worker.close();
}
result.finishedAt = new Date().toISOString();
result.loadAfter = os.loadavg();
result.summary = fixtures.flatMap(fixture => adapters.map(adapter => {
  const samples = result.samples.filter(sample => sample.fixture === fixture && sample.adapter === adapter.id);
  const values = samples.map(sample => sample.operationsPerSecond).sort((a,b) => a-b);
  return { fixture, adapter: adapter.id, samples: values.length, median: values[Math.floor(values.length/2)], min: values[0], max: values.at(-1), completedCalls: samples.reduce((sum,sample) => sum + sample.completedCalls,0), errors: samples.reduce((sum,sample) => sum+sample.errors,0) };
}));
writeFileSync(path.join(directory,'results-options.json'), JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
if (result.failures.length) console.error(result.failures);
