import { array, boolean, memory, mode, number, object, text } from './json.js';
import type {
  Assessment,
  Audit,
  Metadata,
  ProbeResult,
  Sample,
  Startup,
  WarmMemory,
} from './types.js';

function assessment(value: unknown): Assessment {
  if (
    value !== 'ascii-only' &&
    value !== 'not-valid-reading' &&
    value !== 'probe-matched-only' &&
    value !== 'reading-unverified'
  )
    throw new TypeError('Unknown assessment');
  return value;
}
export function audit(value: unknown): Audit {
  const record = object(value);
  const probes = array(record.probes, (item): ProbeResult => {
    const probe = object(item);
    const status = assessment(probe.assessment);
    if (status === 'ascii-only')
      throw new TypeError('Invalid reading probe assessment');
    return {
      id: text(probe.id),
      input: text(probe.input),
      output: text(probe.output),
      flags: array(probe.flags, text),
      assessment: status,
      cjk: boolean(probe.cjk),
    };
  });
  return {
    adapter: text(record.adapter),
    mode: mode(record.mode),
    fixture: text(record.fixture),
    outputs: array(record.outputs, (item) => {
      const output = object(item);
      return {
        input: text(output.input),
        output: text(output.output),
        flags: array(output.flags, text),
      };
    }),
    probes,
    flags: array(record.flags, text),
    assessment: assessment(record.assessment),
  };
}
export function metadata(value: unknown): Metadata {
  const record = object(value);
  return {
    id: text(record.id),
    name: text(record.name),
    package: text(record.package),
    version: text(record.version),
    displayVersion: text(record.displayVersion),
    runtime: text(record.runtime),
    options: text(record.options),
    entry: text(record.entry),
    entrySha256: text(record.entrySha256),
    modes: array(record.modes, mode),
  };
}
const optionalNumber = (value: unknown): number | null =>
  value === undefined || value === null ? null : number(value);
export function sample(
  value: unknown,
  context: {
    adapter: string;
    round: number;
    sequence: number;
    unit: Sample['unit'];
  }
): Sample {
  const record = object(value);
  const result: Sample = {
    ...context,
    mode: mode(record.mode),
    fixture: text(record.fixture),
    iterations: number(record.iterations),
    completedCalls: number(record.completedCalls),
    elapsedMs: number(record.elapsedMs),
    operationsPerSecond: number(record.operationsPerSecond),
    inputMiBPerSecond: number(record.inputMiBPerSecond),
    checksum: number(record.checksum),
    expectedChecksum: number(record.expectedChecksum),
    outputUnits: number(record.outputUnits),
    expectedOutputUnits: number(record.expectedOutputUnits),
    cpuMs: optionalNumber(record.cpuMs),
    cpuToWallRatio: optionalNumber(record.cpuToWallRatio),
    errors: number(record.errors),
    stable: boolean(record.stable),
    warmupCalls: optionalNumber(record.warmupCalls),
    warmupElapsedMs: optionalNumber(record.warmupElapsedMs),
    calibrationIterations: optionalNumber(record.calibrationIterations),
    calibrationElapsedMs: optionalNumber(record.calibrationElapsedMs),
  };
  if (
    result.errors !== 0 ||
    !result.stable ||
    result.completedCalls !== result.iterations ||
    result.checksum !== result.expectedChecksum ||
    result.outputUnits !== result.expectedOutputUnits ||
    result.iterations <= 0 ||
    result.elapsedMs <= 0
  )
    throw new Error(
      `Work validation failed: ${context.adapter}/${result.fixture}`
    );
  return result;
}
export function startup(value: unknown): Startup {
  const record = object(value);
  return {
    adapter: text(record.adapter),
    importMs: number(record.importMs),
    firstCallMs: number(record.firstCallMs),
    beforeImport: memory(record.beforeImport),
    afterImport: memory(record.afterImport),
    afterFirstCall: memory(record.afterFirstCall),
  };
}
export function warmMemory(value: unknown): WarmMemory {
  const record = object(value);
  return {
    adapter: text(record.adapter),
    afterWarm: memory(record.afterWarm),
    warmDelta: memory(record.warmDelta),
  };
}
