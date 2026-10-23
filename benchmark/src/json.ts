import type { Memory, Mode, Protocol, WorkerJob } from './types.js';

export function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('Expected JSON object');
  return Object.fromEntries(Object.entries(value));
}
export function text(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Expected string');
  return value;
}
export function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new TypeError('Expected finite number');
  return value;
}
export function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new TypeError('Expected boolean');
  return value;
}
export function array<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new TypeError('Expected array');
  return value.map(parse);
}
export function mode(value: unknown): Mode {
  if (value !== 'transliterate' && value !== 'slugify')
    throw new TypeError('Unknown API');
  return value;
}
export function parse(value: string): unknown {
  return JSON.parse(value);
}
export function memory(value: unknown): Memory {
  const record = object(value);
  return {
    rss: number(record.rss),
    heapTotal: number(record.heapTotal),
    heapUsed: number(record.heapUsed),
    external: number(record.external),
    arrayBuffers: number(record.arrayBuffers),
  };
}
export function protocol(value: unknown): Protocol {
  const record = object(value);
  return {
    rounds: number(record.rounds),
    targetMs: number(record.targetMs),
    warmupMs: number(record.warmupMs),
    calibrationMs: number(record.calibrationMs),
  };
}
export function workerJob(value: unknown): WorkerJob & { requestId: number } {
  const record = object(value);
  const requestId = number(record.requestId);
  switch (record.type) {
    case 'audit':
      return {
        type: 'audit',
        requestId,
        fixtureIds: array(record.fixtureIds, text),
      };
    case 'sample':
      return {
        type: 'sample',
        requestId,
        mode: mode(record.mode),
        fixture: text(record.fixture),
        protocol: protocol(record.protocol),
      };
    case 'memory':
      return { type: 'memory', requestId };
    default:
      throw new TypeError('Unknown worker request');
  }
}
