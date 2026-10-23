import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(script), '../..');
const bundle = path.join(root, 'dist/node/src/node/index.js');
const require = createRequire(import.meta.url);
const fixtures = [
  ['ascii', 'A practical product guide with stable links and clear titles for readers'],
  ['chinese', '这个模块用于把中文标题转换成拉丁字母，为用户生成清晰稳定的链接和文章标题。'],
  ['korean', '이 서비스는 한국어 제목을 로마자로 변환하고 읽기 쉬운 링크를 생성합니다.'],
  ['thai', 'บริการนี้แปลงข้อความภาษาไทยเป็นอักษรโรมันสำหรับลิงก์และชื่อเรื่อง'],
  ['arabic', 'تقوم هذه الخدمة بتحويل العناوين العربية إلى حروف لاتينية لإنشاء روابط مستقرة'],
];
const contracts = [
  ['你好', 'Ni Hao'], ['한국', 'hangug'], ['สามารถ', 'saamaarth'], ['مرحبا', 'mrHb'],
];

function checkApi(api) {
  for (const [input, expected] of contracts) assert.equal(api.transliterate(input), expected);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function summary(values) {
  return { median: median(values), min: Math.min(...values), max: Math.max(...values) };
}

async function child(mode) {
  const process = fork(script, [mode], { execArgv: ['--expose-gc'], silent: true });
  let stderr = '';
  process.stderr.on('data', (data) => { stderr += data; });
  process.on('error', (error) => { throw error; });
  const [message] = await once(process, 'message');
  if (mode !== 'serve') {
    const [code] = await once(process, 'exit');
    assert.equal(code, 0, stderr);
  }
  return { process, message };
}

if (process.argv[2] === 'memory') {
  global.gc();
  const before = process.memoryUsage();
  const start = performance.now();
  const api = require(bundle);
  const importMs = performance.now() - start;
  checkApi(api);
  global.gc();
  const after = process.memoryUsage();
  process.send({ importMs, before, after, heapDelta: after.heapUsed - before.heapUsed, rssDelta: after.rss - before.rss });
  process.disconnect();
} else if (process.argv[2] === 'serve') {
  const api = require(bundle);
  checkApi(api);
  let completed = 0;
  let failed = 0;
  const server = http.createServer(async (request, response) => {
    try {
      request.setEncoding('utf8');
      let body = '';
      for await (const part of request) {
        body += part;
        if (body.length > 16_384) throw new Error('oversize');
      }
      const input = JSON.parse(body);
      assert.equal(typeof input.text, 'string');
      const text = api.transliterate(input.text);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ text }));
      completed += 1;
    } catch {
      failed += 1;
      response.writeHead(400);
      response.end();
    }
  });
  process.on('message', (message) => {
    if (message === 'stats') process.send({ completed, failed, memory: process.memoryUsage(), cpu: process.cpuUsage() });
    if (message === 'stop') server.close(() => process.exit(0));
  });
  server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
} else {
  // Confirm the production artifact embeds the exact current source files.
  const mapFile = bundle + '.map';
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  for (let i = 0; i < map.sources.length; i += 1) {
    assert.equal(fs.readFileSync(path.resolve(path.dirname(mapFile), map.sources[i]), 'utf8'), map.sourcesContent[i]);
  }
  const api = require(bundle);
  checkApi(api);
  const result = {
    scope: 'Current mapping engine; not a neural/quality/Azure comparison',
    node: process.version, cpu: os.cpus()[0].model, logicalCpus: os.cpus().length,
    loadBefore: os.loadavg(), sourceMapSourcesVerified: map.sources.length,
    errors: 0, checksum: 0, memoryRuns: [], micro: [], http: [],
  };
  for (let repeat = 0; repeat < 5; repeat += 1) result.memoryRuns.push((await child('memory')).message);
  const cases = fixtures.map(([name, text]) => {
    const inputs = Array.from({ length: 32 }, (_, i) => text + ' ' + String(2026 + i));
    return { name, inputs, expected: inputs.map((input) => api.transliterate(input)) };
  });
  for (const entry of cases) {
    let checksum = 0;
    for (let i = 0; i < 5_000; i += 1) checksum += api.transliterate(entry.inputs[i % 32]).length;
    const calibrationStart = performance.now();
    for (let i = 0; i < 2_000; i += 1) checksum += api.transliterate(entry.inputs[i % 32]).length;
    const perCallMs = (performance.now() - calibrationStart) / 2_000;
    entry.iterations = Math.min(200_000, Math.max(5_000, Math.ceil(200 / perCallMs)));
    entry.runs = [];
    result.checksum += checksum;
  }
  // Rotate order on each repetition to reduce warmup/load drift.
  for (let repeat = 0; repeat < 5; repeat += 1) {
    for (let position = 0; position < cases.length; position += 1) {
      const entry = cases[(position + repeat) % cases.length];
      let checksum = 0;
      const start = performance.now();
      for (let i = 0; i < entry.iterations; i += 1) checksum += api.transliterate(entry.inputs[i % 32]).length;
      const elapsedMs = performance.now() - start;
      let expectedChecksum = 0;
      for (let i = 0; i < entry.iterations; i += 1) expectedChecksum += entry.expected[i % 32].length;
      assert.equal(checksum, expectedChecksum);
      result.checksum += checksum;
      entry.runs.push({ elapsedMs, calls: entry.iterations, usPerCall: elapsedMs * 1_000 / entry.iterations });
    }
  }
  result.micro = cases.map((entry) => ({
    name: entry.name, codePoints: [...entry.inputs[0]].length,
    usPerCall: summary(entry.runs.map((run) => run.usPerCall)), runs: entry.runs,
  }));
  if (process.argv[2] !== 'micro-only') {
    const service = await child('serve');
    const requestsPerRun = 1_000;
    for (const concurrency of [1, 16]) {
      const runs = [];
      for (let repeat = 0; repeat < 5; repeat += 1) {
        const latencies = [];
        let completed = 0;
        const clientCpuStart = process.cpuUsage();
        const start = performance.now();
        await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
          for (let i = worker; i < requestsPerRun; i += concurrency) {
            const entry = cases[i % cases.length];
            const index = i % 32;
            const requestStart = performance.now();
            const response = await fetch('http://127.0.0.1:' + service.message.port, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: entry.inputs[index] }),
            });
            assert.equal(response.status, 200);
            assert.equal((await response.json()).text, entry.expected[index]);
            latencies.push(performance.now() - requestStart);
            completed += 1;
          }
        }));
        const elapsedMs = performance.now() - start;
        assert.equal(completed, requestsPerRun);
        latencies.sort((a, b) => a - b);
        runs.push({
          requests: completed, elapsedMs, requestsPerSecond: completed * 1_000 / elapsedMs,
          p50Ms: latencies[Math.floor(latencies.length * 0.50)],
          p95Ms: latencies[Math.floor(latencies.length * 0.95)],
          p99Ms: latencies[Math.floor(latencies.length * 0.99)],
          clientCpu: process.cpuUsage(clientCpuStart),
        });
      }
      result.http.push({ concurrency, runs, requestsPerSecond: summary(runs.map((run) => run.requestsPerSecond)), p95Ms: summary(runs.map((run) => run.p95Ms)) });
    }
    service.process.send('stats');
    [result.server] = await once(service.process, 'message');
    assert.equal(result.server.failed, 0);
    assert.equal(result.server.completed, requestsPerRun * 10);
    service.process.send('stop');
    await once(service.process, 'exit');
  }
  result.loadAfter = os.loadavg();
  result.memory = {
    importMs: summary(result.memoryRuns.map((run) => run.importMs)),
    heapDeltaBytes: summary(result.memoryRuns.map((run) => run.heapDelta)),
    rssAfterBytes: summary(result.memoryRuns.map((run) => run.after.rss)),
    rssDeltaBytes: summary(result.memoryRuns.map((run) => run.rssDelta)),
  };
  console.log(JSON.stringify(result, null, 2));
}
