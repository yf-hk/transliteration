import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import {
  type fixtures,
  inspectOutput,
  inspectProbe,
  probes,
} from './fixtures.js';
import { array, object, parse, text } from './json.js';
import { directory, nativeBuildDirectory, nativeDirectory } from './paths.js';
import { sample } from './protocol.js';
import type { Audit, NativeAdapter, Protocol, RunResult } from './types.js';

export function buildNative(icuPrefix: string): Record<string, string> {
  mkdirSync(nativeBuildDirectory, { recursive: true });
  execFileSync(
    'cargo',
    [
      'build',
      '--release',
      '--locked',
      '--offline',
      '--manifest-path',
      path.join(nativeDirectory, 'rust/Cargo.toml'),
      '--target-dir',
      path.join(nativeBuildDirectory, 'rust'),
    ],
    { stdio: 'inherit' }
  );
  execFileSync(
    process.env.CXX ?? 'clang++',
    [
      '-O3',
      '-std=c++17',
      `-I${path.join(icuPrefix, 'include')}`,
      path.join(nativeDirectory, 'icu.cpp'),
      `-L${path.join(icuPrefix, 'lib')}`,
      `-Wl,-rpath,${path.join(icuPrefix, 'lib')}`,
      '-licui18n',
      '-licuuc',
      '-licudata',
      '-o',
      path.join(nativeBuildDirectory, 'icu-worker'),
    ],
    { stdio: 'inherit' }
  );
  return {
    rustc: execFileSync('rustc', ['--version'], { encoding: 'utf8' }).trim(),
    clang: execFileSync(process.env.CXX ?? 'clang++', ['--version'], {
      encoding: 'utf8',
    }).trim(),
    icu: execFileSync(path.join(icuPrefix, 'bin/uconv'), ['-V'], {
      encoding: 'utf8',
    }).trim(),
  };
}
export function startNative(
  adapter: NativeAdapter,
  python: string,
  protocol: Protocol
) {
  const entry =
    adapter.runtime === 'python'
      ? path.join(nativeDirectory, 'python.py')
      : adapter.runtime === 'rust'
        ? path.join(
            nativeBuildDirectory,
            'rust/release/transliteration-compare'
          )
        : path.join(nativeBuildDirectory, 'icu-worker');
  const command = adapter.runtime === 'python' ? python : entry;
  const arguments_ =
    adapter.runtime === 'python'
      ? [entry, adapter.id]
      : adapter.runtime === 'rust'
        ? [adapter.id]
        : [];
  const child = spawn(command, arguments_, { stdio: ['pipe', 'pipe', 'pipe'] });
  let pending:
    | {
        resolve: (value: unknown) => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    | undefined;
  let diagnostic = '';
  function fail(error: Error): void {
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      pending = undefined;
    }
    child.kill();
  }
  child.stderr.on('data', (chunk: Buffer) => {
    diagnostic = `${diagnostic}${chunk.toString()}`.slice(-8192);
  });
  child.on('error', fail);
  child.on('exit', (code) => {
    if (pending) fail(new Error(`Native worker exited ${code}: ${diagnostic}`));
  });
  createInterface({ input: child.stdout }).on('line', (line) => {
    if (!pending) {
      child.kill();
      throw new Error('Unexpected native response');
    }
    const current = pending;
    pending = undefined;
    clearTimeout(current.timer);
    try {
      current.resolve(parse(line));
    } catch (error) {
      current.reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
  return {
    entry,
    digest: createHash('sha256').update(readFileSync(entry)).digest('hex'),
    request(fixture: (typeof fixtures)[number]): Promise<unknown> {
      if (pending)
        return Promise.reject(new Error('Native worker must be idle'));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => fail(new Error(`Native timeout: ${diagnostic}`)),
          30_000
        );
        pending = { resolve, reject, timer };
        const pureProbes = Object.fromEntries(
          Object.entries(probes).map(([id, probe]) => [id, probe.input])
        );
        const line =
          adapter.runtime === 'icu'
            ? [
                protocol.targetMs,
                fixture.id,
                fixture.texts.length,
                ...fixture.texts,
                ...Object.entries(pureProbes).flat(),
              ].join('\t')
            : JSON.stringify({
                targetMs: protocol.targetMs,
                fixture: fixture.id,
                texts: fixture.texts,
                probes: pureProbes,
              });
        child.stdin.write(`${line}\n`, (error) => {
          if (error) fail(error);
        });
      });
    },
    close(): void {
      child.stdin.end();
    },
  };
}
export async function measureNative(
  result: RunResult,
  adapters: NativeAdapter[],
  python: string,
  selectedFixtures: typeof fixtures
): Promise<void> {
  const workers = new Map(
    adapters.map((adapter) => [
      adapter.id,
      startNative(adapter, python, result.protocol),
    ])
  );
  const rotate = <T>(values: T[], offset: number): T[] => [
    ...values.slice(offset % values.length),
    ...values.slice(0, offset % values.length),
  ];
  try {
    for (let round = 0; round < result.protocol.rounds; round++) {
      for (const fixture of rotate(selectedFixtures, round)) {
        for (const adapter of rotate(
          adapters,
          round + selectedFixtures.indexOf(fixture)
        )) {
          const worker = workers.get(adapter.id);
          if (!worker) throw new Error('Missing native worker');
          await measureNativeFixture(
            result,
            adapter,
            worker,
            fixture,
            round + 1
          );
        }
      }
      process.stdout.write(
        `Cross-runtime round ${round + 1}/${result.protocol.rounds}: ${result.samples.filter((sample) => sample.unit !== 'utf16').length} valid samples\n`
      );
    }
  } finally {
    for (const worker of workers.values()) worker.close();
  }
}

async function measureNativeFixture(
  result: RunResult,
  adapter: NativeAdapter,
  worker: ReturnType<typeof startNative>,
  fixture: (typeof fixtures)[number],
  round: number
): Promise<void> {
  const value = object(await worker.request(fixture));
  const measured = sample(value, {
    adapter: adapter.id,
    round,
    sequence: result.samples.length + 1,
    unit: adapter.runtime === 'python' ? 'codepoints' : 'utf8',
  });
  result.samples.push(measured);
  const outputs = array(value.outputs, text);
  if (round === 1) {
    result.audits.push(nativeAudit(adapter, fixture, value, measured.mode));
  } else {
    const original = result.audits.find(
      (audit) => audit.adapter === adapter.id && audit.fixture === fixture.id
    );
    if (
      !original ||
      JSON.stringify(original.outputs.map((output) => output.output)) !==
        JSON.stringify(outputs)
    )
      throw new Error('Native cross-round output drift');
  }
  if (!result.adapters.some((item) => item.id === adapter.id)) {
    const version = text(value.version);
    result.adapters.push({
      id: adapter.id,
      name: adapter.name,
      package: typeof value.package === 'string' ? value.package : adapter.id,
      version,
      displayVersion: version,
      options: adapter.options,
      modes: adapter.modes,
      runtime:
        adapter.runtime === 'python'
          ? `Python ${text(value.runtime)}`
          : adapter.runtime === 'rust'
            ? result.provenance.versions.rustc
            : `ICU C++ ${version}`,
      entry: path.relative(directory, worker.entry),
      entrySha256: worker.digest,
    });
  }
}

function nativeAudit(
  adapter: NativeAdapter,
  fixture: (typeof fixtures)[number],
  value: Record<string, unknown>,
  mode: Audit['mode']
): Audit {
  const outputs = array(value.outputs, text);
  const probeOutputs = object(value.probeOutputs);
  const inspectedProbes = fixture.probes.map((id) =>
    inspectProbe(id, (input) => {
      const found = Object.keys(probes).find(
        (key) => probes[key].input === input
      );
      if (!found) throw new Error('Unknown native probe');
      return text(probeOutputs[found]);
    })
  );
  const inspectedOutputs = outputs.map((output, index) => ({
    input: fixture.texts[index],
    output,
    flags: inspectOutput(fixture.texts[index], output),
  }));
  const flags = [
    ...new Set([
      ...inspectedOutputs.flatMap((output) => output.flags),
      ...inspectedProbes.flatMap((probe) => probe.flags),
    ]),
  ];
  const assessment: Audit['assessment'] = flags.length
    ? 'not-valid-reading'
    : fixture.id === 'ascii'
      ? 'ascii-only'
      : inspectedProbes.every(
            (probe) => probe.assessment === 'probe-matched-only'
          )
        ? 'probe-matched-only'
        : 'reading-unverified';
  return {
    adapter: adapter.id,
    mode,
    fixture: fixture.id,
    outputs: inspectedOutputs,
    probes: inspectedProbes,
    flags,
    assessment,
  };
}
