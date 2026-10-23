import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { loadAdapter, metadata, resolveAdapter } from './adapters.js';
import { fixtures, inspectOutput, inspectProbe } from './fixtures.js';
import { object, parse, text, workerJob } from './json.js';
import type {
  Api,
  Audit,
  Converter,
  Fixture,
  Memory,
  NodeAdapter,
  Sample,
  WorkerJob,
} from './types.js';

const configuration = object(parse(process.env.BENCHMARK_ADAPTER ?? 'null'));
function configuredAdapter(): NodeAdapter {
  const modes = ['transliterate', 'slugify'].filter(
    (mode) =>
      Array.isArray(configuration.modes) && configuration.modes.includes(mode)
  );
  if (configuration.kind === 'local') {
    const map = configuration.map;
    const role = configuration.role;
    if (
      (map !== 'full' && map !== 'latin') ||
      (role !== 'before' && role !== 'after' && role !== 'snapshot')
    )
      throw new TypeError('Invalid local adapter');
    return {
      id: text(configuration.id),
      name: text(configuration.name),
      options: text(configuration.options),
      kind: 'local',
      root: text(configuration.root),
      map,
      role,
      modes: modes.map((value) =>
        value === 'transliterate' ? 'transliterate' : 'slugify'
      ),
    };
  }
  const style = configuration.style;
  if (
    configuration.kind !== 'package' ||
    !['default', 'slugify', 'slug', 'pinyin'].includes(text(style))
  )
    throw new TypeError('Invalid package adapter');
  if (
    style !== 'default' &&
    style !== 'slugify' &&
    style !== 'slug' &&
    style !== 'pinyin'
  )
    throw new TypeError('Invalid package style');
  return {
    id: text(configuration.id),
    name: text(configuration.name),
    options: text(configuration.options),
    kind: 'package',
    package: text(configuration.package),
    style,
    modes: modes.map((value) =>
      value === 'transliterate' ? 'transliterate' : 'slugify'
    ),
  };
}
const adapter = configuredAdapter();
const send = process.send?.bind(process);
if (!send) throw new Error('Run workers through the benchmark command');
type State = { convert: Converter; fixture: Fixture; expected: string[] };
const states = new Map<string, State>();
let api: Api = { methods: {} };
const memory = (): Memory => {
  if (!global.gc) throw new Error('Measurement workers require --expose-gc');
  global.gc();
  return process.memoryUsage();
};
const fingerprint = (output: string) =>
  output.length +
  (output.charCodeAt(0) || 0) +
  (output.charCodeAt(output.length - 1) || 0);
function assertStable(state: State): void {
  for (const [index, input] of state.fixture.texts.entries())
    if (state.convert(input) !== state.expected[index])
      throw new Error(`Unstable output: ${state.fixture.id}/${index}`);
}
function auditFixture(
  mode: Audit['mode'],
  fixture: Fixture,
  convert: Converter
): Audit {
  const expected = fixture.texts.map((input) => text(convert(input)));
  const state = { convert, fixture, expected };
  assertStable(state);
  states.set(`${mode}/${fixture.id}`, state);
  const probes = fixture.probes.map((id) =>
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
      ...probes.flatMap((probe) => probe.flags),
    ]),
  ];
  const assessment = flags.length
    ? 'not-valid-reading'
    : fixture.id === 'ascii'
      ? 'ascii-only'
      : probes.every((probe) => probe.assessment === 'probe-matched-only')
        ? 'probe-matched-only'
        : 'reading-unverified';
  return {
    adapter: adapter.id,
    mode,
    fixture: fixture.id,
    outputs,
    probes,
    flags,
    assessment,
  };
}
function audit(ids: string[]): Audit[] {
  return adapter.modes.flatMap((mode) => {
    const convert = api.methods[mode];
    if (!convert) throw new Error(`Missing ${mode}`);
    if (
      convert('Hello World 123') !==
      (mode === 'transliterate' ? 'Hello World 123' : 'hello-world-123')
    )
      throw new Error('ASCII sanity check failed');
    return ids.map((id) => {
      const fixture = fixtures.find((item) => item.id === id);
      if (!fixture) throw new Error(`Unknown fixture ${id}`);
      return auditFixture(mode, fixture, convert);
    });
  });
}
function sample(
  job: Extract<WorkerJob, { type: 'sample' }>
): Omit<Sample, 'adapter' | 'round' | 'sequence'> {
  const state = states.get(`${job.mode}/${job.fixture}`);
  if (!state) throw new Error('Audit must precede timing');
  const { convert, fixture, expected } = state;
  const { texts } = fixture;
  const maxIterations = Math.floor(2 ** 24 / texts.length) * texts.length;
  function runBatch(iterations: number) {
    let checksum = 0;
    let outputUnits = 0;
    let completedCalls = 0;
    try {
      for (let index = 0; index < iterations; index++) {
        const output = convert(texts[index % texts.length]);
        if (typeof output !== 'string')
          throw new TypeError('Non-string conversion output');
        checksum = (checksum + fingerprint(output)) >>> 0;
        outputUnits += output.length;
        completedCalls++;
      }
    } catch (error) {
      throw Object.assign(
        error instanceof Error ? error : new Error(String(error)),
        { completedCalls }
      );
    }
    return { checksum, outputUnits, completedCalls };
  }
  assertStable(state);
  const warmStart = performance.now();
  let warmupCalls = 0;
  do {
    runBatch(texts.length);
    warmupCalls += texts.length;
  } while (performance.now() - warmStart < job.protocol.warmupMs);
  const warmupElapsedMs = performance.now() - warmStart;
  let calibrationIterations = texts.length;
  let calibrationElapsedMs: number;
  do {
    const start = performance.now();
    runBatch(calibrationIterations);
    calibrationElapsedMs = performance.now() - start;
    if (
      calibrationElapsedMs >= job.protocol.calibrationMs ||
      calibrationIterations >= maxIterations
    )
      break;
    calibrationIterations = Math.min(maxIterations, calibrationIterations * 2);
  } while (calibrationElapsedMs < job.protocol.calibrationMs);
  const iterations = Math.max(
    texts.length,
    Math.min(
      maxIterations,
      Math.ceil(
        (calibrationIterations * job.protocol.targetMs) /
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
      expected.reduce((sum, value) => (sum + fingerprint(value)) >>> 0, 0),
      cycles
    ) >>> 0;
  const expectedOutputUnits =
    expected.reduce((sum, value) => sum + value.length, 0) * cycles;
  if (
    consumed.checksum !== expectedChecksum ||
    consumed.outputUnits !== expectedOutputUnits ||
    consumed.completedCalls !== iterations
  )
    throw new Error('Timed output validation failed');
  assertStable(state);
  const bytes =
    texts.reduce((sum, value) => sum + Buffer.byteLength(value), 0) * cycles;
  const cpuMs = (cpu.user + cpu.system) / 1000;
  return {
    mode: job.mode,
    fixture: job.fixture,
    iterations,
    elapsedMs,
    operationsPerSecond: (iterations / elapsedMs) * 1000,
    inputMiBPerSecond: ((bytes / elapsedMs) * 1000) / 2 ** 20,
    cpuMs,
    cpuToWallRatio: cpuMs / elapsedMs,
    ...consumed,
    expectedChecksum,
    expectedOutputUnits,
    unit: 'utf16',
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
  const beforeImport = memory();
  const start = performance.now();
  api = await loadAdapter(adapter, resolved.entry);
  const importMs = performance.now() - start;
  const afterImport = memory();
  const convert = api.methods[adapter.modes[0]];
  if (!convert) throw new Error('Missing first-call converter');
  const firstStart = performance.now();
  text(convert('Crème 北京 안녕하세요'));
  const firstCallMs = performance.now() - firstStart;
  const afterFirstCall = memory();
  send({
    type: 'ready',
    metadata: metadata(
      adapter,
      resolved,
      createHash('sha256').update(readFileSync(resolved.entry)).digest('hex')
    ),
    startup: {
      adapter: adapter.id,
      importMs,
      firstCallMs,
      beforeImport,
      afterImport,
      afterFirstCall,
    },
  });
  process.on('message', (value: unknown) => {
    let requestId = 0;
    try {
      const job = workerJob(value);
      requestId = job.requestId;
      let result: unknown;
      switch (job.type) {
        case 'audit':
          result = audit(job.fixtureIds);
          break;
        case 'sample':
          result = sample(job);
          break;
        case 'memory': {
          const afterWarm = memory();
          const warmDelta: Memory = {
            rss: afterWarm.rss - beforeImport.rss,
            heapUsed: afterWarm.heapUsed - beforeImport.heapUsed,
            heapTotal: afterWarm.heapTotal - beforeImport.heapTotal,
            external: afterWarm.external - beforeImport.external,
            arrayBuffers: afterWarm.arrayBuffers - beforeImport.arrayBuffers,
          };
          result = { adapter: adapter.id, afterWarm, warmDelta };
          break;
        }
      }
      send({ requestId, ok: true, result });
    } catch (error) {
      send({
        requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
} catch (error) {
  send({
    type: 'startup-error',
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
}
