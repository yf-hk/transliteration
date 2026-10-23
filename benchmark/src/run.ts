import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { nativeAdapters, nodeAdapters } from './adapters.js';
import { measureBrowserArtifacts } from './artifacts.js';
import { fixtures } from './fixtures.js';
import { array } from './json.js';
import { buildNative, measureNative } from './native.js';
import { directory, repository } from './paths.js';
import { startWorker } from './process.js';
import { audit, sample, warmMemory } from './protocol.js';
import { capture } from './provenance.js';
import { writeReports } from './report.js';
import type { Mode, NodeAdapter, RunResult } from './types.js';

const { values } = parseArgs({
  options: {
    full: { type: 'boolean' },
    quick: { type: 'boolean' },
    'javascript-only': { type: 'boolean' },
    before: { type: 'string' },
    snapshot: { type: 'string' },
    archive: { type: 'string' },
    python: { type: 'string' },
    'icu-prefix': { type: 'string' },
    adapters: { type: 'string' },
    fixtures: { type: 'string' },
    output: { type: 'string' },
    'update-readme': { type: 'boolean' },
    'no-sizes': { type: 'boolean' },
    list: { type: 'boolean' },
    help: { type: 'boolean' },
  },
});
if (values.help) {
  process.stdout.write(
    'Compile with bun run --cwd benchmark build, then node benchmark/.build/run.js --full --before PACKAGE_DIRECTORY --archive TESTED_TARBALL --update-readme. See benchmark/README.md for all options and native prerequisites.\n'
  );
  process.exit(0);
}
if (values.quick && values.full) throw new Error('Choose --quick or --full');
if (
  values['update-readme'] &&
  (!values.full ||
    values['javascript-only'] ||
    values.adapters ||
    values.fixtures)
)
  throw new Error('README refresh requires a complete full run');
const before = path.resolve(
  repository,
  values.before ??
    [
      path.join(directory, '.cache/published/package'),
      path.join(
        repository,
        'research/2026-10-23-performance/deps/node_modules/transliteration'
      ),
    ].find((candidate) => existsSync(path.join(candidate, 'package.json'))) ??
    path.join(directory, '.cache/published/package')
);
const allNode = nodeAdapters(
  before,
  values.snapshot ? path.resolve(repository, values.snapshot) : undefined
);
if (values.list) {
  for (const adapter of [...allNode, ...nativeAdapters])
    process.stdout.write(
      `${adapter.id}\t${adapter.name}\t${adapter.modes.join(', ')}\n`
    );
  process.stdout.write(
    `Fixtures: ${fixtures.map((fixture) => fixture.id).join(', ')}\n`
  );
  process.exit(0);
}
function select<T extends { id: string }>(
  items: T[],
  selection: string | undefined
): T[] {
  if (!selection) return items;
  return [...new Set(selection.split(','))].map((id) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) throw new Error(`Unknown selection: ${id}`);
    return item;
  });
}
const selectedIds = values.adapters?.split(',');
if (
  selectedIds?.some(
    (id) =>
      ![...allNode, ...nativeAdapters].some((adapter) => adapter.id === id)
  )
)
  throw new Error('Unknown adapter; use --list');
const selectedNode = selectedIds
  ? allNode.filter((adapter) => selectedIds.includes(adapter.id))
  : allNode;
if (!selectedNode.some((adapter) => adapter.id === 'ours-full'))
  throw new Error(
    'The full current reference is required for output comparisons'
  );
const selectedNative =
  values.full && !values['javascript-only']
    ? nativeAdapters.filter(
        (adapter) => !selectedIds || selectedIds.includes(adapter.id)
      )
    : [];
const selectedFixtures = select(
  fixtures,
  values.fixtures ??
    (values.full
      ? undefined
      : 'ascii,latin,cyrillic,chinese,japanese,korean,mixed')
);
const protocol = values.full
  ? { rounds: 5, targetMs: 250, warmupMs: 12, calibrationMs: 12 }
  : { rounds: 1, targetMs: 15, warmupMs: 3, calibrationMs: 4 };
const output = path.resolve(
  repository,
  values.output ??
    path.join(
      directory,
      'results',
      `${new Date().toISOString().replaceAll(':', '-')}-typescript`
    )
);
mkdirSync(output, { recursive: true });
if (readdirSync(output).length)
  throw new Error('Output directory must be empty');
const python =
  (values.python ? path.resolve(repository, values.python) : undefined) ??
  process.env.BENCHMARK_PYTHON ??
  (existsSync(path.join(directory, '.venv/bin/python'))
    ? path.join(directory, '.venv/bin/python')
    : 'python3');
const versions = selectedNative.length
  ? {
      ...buildNative(
        values['icu-prefix'] ??
          process.env.ICU_PREFIX ??
          execFileSync('pkg-config', ['--variable=prefix', 'icu-i18n'], {
            encoding: 'utf8',
          }).trim()
      ),
      python: execFileSync(python, ['--version'], { encoding: 'utf8' }).trim(),
    }
  : {};
const provenance = capture(
  before,
  values.archive ? path.resolve(repository, values.archive) : undefined,
  versions
);
writeFileSync(
  path.join(output, 'preflight.json'),
  `${JSON.stringify(provenance, null, 2)}\n`
);
const startedAt = new Date().toISOString();
const phase = {
  startedAt,
  endedAt: startedAt,
  loadStart: os.loadavg(),
  loadEnd: os.loadavg(),
};
const result: RunResult = {
  schemaVersion: 2,
  startedAt,
  endedAt: startedAt,
  protocol,
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuModel: os.cpus()[0]?.model ?? 'unknown',
    logicalCpus: os.cpus().length,
    nodeOptions: process.env.NODE_OPTIONS ?? '',
  },
  provenance,
  fixtures: selectedFixtures,
  adapters: [],
  audits: [],
  samples: [],
  startup: [],
  memory: [],
  artifacts: [],
  phases: { javascript: phase, cross: null },
  failures: [],
};
const rotate = <T>(items: T[], offset: number): T[] => [
  ...items.slice(offset % items.length),
  ...items.slice(0, offset % items.length),
];
const workers = new Map<string, Awaited<ReturnType<typeof startWorker>>>();
let activeAdapter = 'initialization';
let activePhase = 'javascript';
try {
  for (const adapter of selectedNode) {
    activeAdapter = adapter.id;
    const worker = await startWorker(adapter);
    workers.set(adapter.id, worker);
    result.adapters.push(worker.metadata);
    result.startup.push(worker.startup);
    result.audits.push(
      ...array(
        await worker.request({
          type: 'audit',
          fixtureIds: selectedFixtures.map((fixture) => fixture.id),
        }),
        audit
      )
    );
  }
  process.stdout.write(
    `TypeScript benchmark: ${selectedNode.length} Node adapters, ${selectedNative.length} native adapters, ${selectedFixtures.length} tests, ${protocol.rounds} rounds\n`
  );
  for (let round = 0; round < protocol.rounds; round++) {
    for (const fixture of rotate(selectedFixtures, round)) {
      for (const [modeIndex, mode] of (
        ['transliterate', 'slugify'] satisfies Mode[]
      ).entries()) {
        const candidates: NodeAdapter[] = selectedNode.filter((adapter) =>
          adapter.modes.includes(mode)
        );
        for (const adapter of rotate(
          candidates,
          round + selectedFixtures.indexOf(fixture) + modeIndex
        )) {
          activeAdapter = adapter.id;
          const worker = workers.get(adapter.id);
          if (!worker) throw new Error('Missing Node worker');
          result.samples.push(
            sample(
              await worker.request({
                type: 'sample',
                mode,
                fixture: fixture.id,
                protocol,
              }),
              {
                adapter: adapter.id,
                round: round + 1,
                sequence: result.samples.length + 1,
                unit: 'utf16',
              }
            )
          );
        }
      }
    }
    process.stdout.write(
      `Node round ${round + 1}/${protocol.rounds}: ${result.samples.length} valid samples\n`
    );
  }
  for (const [id, worker] of workers) {
    activeAdapter = id;
    result.memory.push(warmMemory(await worker.request({ type: 'memory' })));
  }
  await Promise.all([...workers.values()].map((worker) => worker.close()));
  workers.clear();
  phase.endedAt = new Date().toISOString();
  phase.loadEnd = os.loadavg();
  if (selectedNative.length) {
    activePhase = 'cross-runtime';
    const crossStart = new Date().toISOString();
    const loadStart = os.loadavg();
    await measureNative(result, selectedNative, python, selectedFixtures);
    result.phases.cross = {
      startedAt: crossStart,
      endedAt: new Date().toISOString(),
      loadStart,
      loadEnd: os.loadavg(),
    };
  }
  if (!values['no-sizes']) result.artifacts = measureBrowserArtifacts();
} catch (error) {
  result.failures.push({
    phase: activePhase,
    adapter: activeAdapter,
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
} finally {
  await Promise.all([...workers.values()].map((worker) => worker.close()));
  result.endedAt = new Date().toISOString();
  writeFileSync(
    path.join(output, 'results.json'),
    `${JSON.stringify(result, null, 2)}\n`
  );
}
if (!result.failures.length)
  writeReports(result, output, values['update-readme'] ?? false);
else process.stderr.write(`${JSON.stringify(result.failures)}\n`);
process.stdout.write(
  `Saved ${output}; ${result.samples.length} samples, ${result.failures.length} failed jobs\n`
);
