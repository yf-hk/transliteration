import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  adapters,
  loadAdapter,
  repository,
  resolveAdapter,
} from './adapters.mjs';
import { fixtures, inspectOutput, inspectProbe } from '../../benchmark/fixtures.mjs';

const adapter = adapters.find((item) => item.id === process.argv[2]);
if (!adapter || !process.send)
  throw new Error('Run this worker through benchmark/run.mjs');

const states = new Map();
const difference = (after, before) =>
  Object.fromEntries(
    Object.keys(after).map((key) => [key, after[key] - before[key]])
  );
const memory = () => {
  global.gc();
  return process.memoryUsage();
};
const fingerprint = (output) =>
  output.length +
  (output.charCodeAt(0) || 0) +
  (output.charCodeAt(output.length - 1) || 0);

let api;
let beforeImport;

function auditFixture(mode, fixtureId, convert) {
  const fixture = fixtures.find((item) => item.id === fixtureId);
  if (!fixture) throw new Error(`Unknown fixture ${fixtureId}`);
  const expected = fixture.texts.map((text) => convert(text));
  if (expected.some((output) => typeof output !== 'string'))
    throw new TypeError(`Non-string output for ${fixtureId}`);
  const state = { convert, fixture, expected };
  assertStable(state);
  states.set(`${mode}/${fixtureId}`, state);
  const probeResults = fixture.probes.map((id) =>
    inspectProbe(id, convert, api.isFallback)
  );
  const outputs = fixture.texts.map((input, index) => ({
    input,
    output: expected[index],
    flags: inspectOutput(input, expected[index], api.isFallback),
  }));
  const flags = [
    ...new Set([
      ...outputs.flatMap((output) => output.flags),
      ...probeResults.flatMap((probe) => probe.flags),
    ]),
  ];
  let assessment = 'reading-unverified';
  if (flags.length) assessment = 'not-valid-reading';
  else if (fixtureId === 'ascii') assessment = 'ascii-only';
  else if (
    probeResults.every((probe) => probe.assessment === 'probe-matched-only')
  )
    assessment = 'probe-matched-only';
  const cjkProbes = probeResults.filter((probe) => probe.cjk);
  return {
    mode,
    fixture: fixtureId,
    outputs,
    probes: probeResults,
    flags,
    assessment,
    cjkReadingEligible: cjkProbes.length
      ? !flags.length &&
        cjkProbes.every((probe) => probe.assessment === 'probe-matched-only')
      : null,
  };
}

function audit(fixtureIds) {
  const result = [];
  for (const mode of adapter.modes) {
    const convert = api.methods[mode];
    if (typeof convert !== 'function')
      throw new TypeError(`Missing ${mode} function`);
    const asciiExpected =
      mode === 'transliterate' ? 'Hello World 123' : 'hello-world-123';
    if (convert('Hello World 123') !== asciiExpected)
      throw new Error(`ASCII sanity check failed for ${mode}`);
    result.push(...fixtureIds.map((id) => auditFixture(mode, id, convert)));
  }
  return result;
}

function assertStable(state) {
  for (let index = 0; index < state.fixture.texts.length; index++) {
    if (state.convert(state.fixture.texts[index]) !== state.expected[index]) {
      throw new Error(
        `Unstable output for ${state.fixture.id}, input ${index}`
      );
    }
  }
}

function sample({ mode, fixture: fixtureId, protocol }) {
  const state = states.get(`${mode}/${fixtureId}`);
  if (!state)
    throw new Error(`Audit must precede timing for ${mode}/${fixtureId}`);
  const { convert, fixture, expected } = state;
  const { texts } = fixture;
  const maxIterations = Math.floor(2 ** 24 / texts.length) * texts.length;

  function runBatch(iterations) {
    let checksum = 0;
    let outputCodeUnits = 0;
    let completedCalls = 0;
    try {
      for (let index = 0; index < iterations; index++) {
        const output = convert(texts[index % texts.length]);
        if (typeof output !== 'string')
          throw new TypeError('Converter returned a non-string output');
        checksum = (checksum + fingerprint(output)) >>> 0;
        outputCodeUnits += output.length;
        completedCalls++;
      }
    } catch (error) {
      error.completedCalls = completedCalls;
      throw error;
    }
    return { checksum, outputCodeUnits, completedCalls };
  }

  assertStable(state);
  const warmStart = performance.now();
  let warmupCalls = 0;
  do {
    runBatch(texts.length);
    warmupCalls += texts.length;
  } while (performance.now() - warmStart < protocol.warmupMs);
  const warmupElapsedMs = performance.now() - warmStart;

  let calibrationIterations = texts.length;
  let calibrationElapsedMs;
  do {
    const start = performance.now();
    runBatch(calibrationIterations);
    calibrationElapsedMs = performance.now() - start;
    if (
      calibrationElapsedMs >= protocol.calibrationMs ||
      calibrationIterations >= maxIterations
    )
      break;
    calibrationIterations = Math.min(maxIterations, calibrationIterations * 2);
  } while (calibrationElapsedMs < protocol.calibrationMs);

  const iterations = Math.max(
    texts.length,
    Math.min(
      maxIterations,
      Math.ceil(
        (calibrationIterations * protocol.targetMs) /
          Math.max(calibrationElapsedMs, 0.001) /
          texts.length
      ) * texts.length
    )
  );
  const cpuBefore = process.cpuUsage();
  const start = performance.now();
  const consumed = runBatch(iterations);
  const elapsedMs = performance.now() - start;
  const cpu = process.cpuUsage(cpuBefore);
  const cycles = iterations / texts.length;
  const expectedChecksum =
    Math.imul(
      expected.reduce((sum, output) => (sum + fingerprint(output)) >>> 0, 0),
      cycles
    ) >>> 0;
  const expectedOutputUnits =
    expected.reduce((sum, output) => sum + output.length, 0) * cycles;
  if (
    consumed.checksum !== expectedChecksum ||
    consumed.outputCodeUnits !== expectedOutputUnits
  ) {
    throw new Error('Timed output fingerprint changed; this sample is invalid');
  }
  assertStable(state);
  const inputBytes =
    texts.reduce((sum, text) => sum + Buffer.byteLength(text), 0) * cycles;
  const inputCodePoints =
    texts.reduce((sum, text) => sum + [...text].length, 0) * cycles;
  const cpuMs = (cpu.user + cpu.system) / 1000;
  return {
    mode,
    fixture: fixtureId,
    iterations,
    elapsedMs,
    operationsPerSecond: (iterations / elapsedMs) * 1000,
    inputBytes,
    inputCodePoints,
    inputMiBPerSecond: ((inputBytes / elapsedMs) * 1000) / 2 ** 20,
    nanosecondsPerCodePoint: (elapsedMs * 1e6) / inputCodePoints,
    cpuMs,
    cpuToWallRatio: cpuMs / elapsedMs,
    ...consumed,
    expectedChecksum,
    errors: 0,
    stable: true,
    warmupCalls,
    warmupElapsedMs,
    calibrationIterations,
    calibrationElapsedMs,
  };
}

process.on('disconnect', () => process.exit(0));

try {
  const resolved = resolveAdapter(adapter);
  beforeImport = memory();
  const importStart = performance.now();
  api = await loadAdapter(adapter, resolved.entry);
  const importMs = performance.now() - importStart;
  const afterImport = memory();
  const firstStart = performance.now();
  const first = api.methods[adapter.modes[0]]('Crème 北京 안녕하세요');
  const firstCallMs = performance.now() - firstStart;
  if (typeof first !== 'string')
    throw new TypeError('First call returned a non-string output');
  const afterFirstCall = memory();
  process.send({
    type: 'ready',
    metadata: {
      id: adapter.id,
      package: resolved.metadata.name,
      version: resolved.metadata.version,
      engines: resolved.metadata.engines ?? {},
      options: adapter.options,
      entry: adapter.localExport
        ? path.relative(repository, resolved.entry)
        : `${resolved.metadata.name}/${path.relative(path.dirname(resolved.packageFile), resolved.entry)}`,
      entrySha256: createHash('sha256')
        .update(readFileSync(resolved.entry))
        .digest('hex'),
    },
    startup: {
      importMs,
      firstCallMs,
      firstCallMode: adapter.modes[0],
      firstCallOutput: first,
      beforeImport,
      afterImport,
      afterFirstCall,
      importDelta: difference(afterImport, beforeImport),
      firstCallDelta: difference(afterFirstCall, beforeImport),
    },
  });
} catch (error) {
  process.send({ type: 'startup-error', error: error.message });
  process.disconnect();
}

if (api)
  process.on('message', (request) => {
    try {
      let result;
      switch (request.type) {
        case 'audit':
          result = audit(request.fixtures);
          break;
        case 'sample':
          result = sample(request);
          break;
        case 'memory': {
          const afterWarm = memory();
          result = {
            afterWarm,
            warmDelta: difference(afterWarm, beforeImport),
          };
          break;
        }
        default:
          throw new Error(`Unknown request ${request.type}`);
      }
      process.send({ requestId: request.requestId, ok: true, result });
    } catch (error) {
      process.send({
        requestId: request.requestId,
        ok: false,
        error: {
          name: error.name,
          message: error.message,
          completedCalls: error.completedCalls ?? null,
        },
      });
    }
  });
