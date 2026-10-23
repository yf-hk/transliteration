import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { object, parse, text } from './json.js';
import { directory, repository } from './paths.js';
import type { Api, Metadata, NativeAdapter, NodeAdapter } from './types.js';

const require = createRequire(path.join(directory, 'package.json'));
type Callable = (...arguments_: unknown[]) => unknown;
const isCallable = (value: unknown): value is Callable =>
  typeof value === 'function';
const callable = (value: unknown): Callable => {
  if (!isCallable(value)) throw new TypeError('Missing converter function');
  return value;
};

export function nodeAdapters(before: string, snapshot?: string): NodeAdapter[] {
  const result: NodeAdapter[] = [
    {
      id: 'ours-full',
      name: 'After Full',
      kind: 'local',
      root: repository,
      map: 'full',
      role: 'after',
      modes: ['transliterate', 'slugify'],
      options: 'Defaults, full character map',
    },
    {
      id: 'ours-latin',
      name: 'After Latin',
      kind: 'local',
      root: repository,
      map: 'latin',
      role: 'after',
      modes: ['transliterate', 'slugify'],
      options: 'Defaults, Latin character map',
    },
    {
      id: 'published-full',
      name: 'Before Full',
      kind: 'local',
      root: before,
      map: 'full',
      role: 'before',
      modes: ['transliterate', 'slugify'],
      options: 'Published registry release, defaults',
    },
    {
      id: 'any-ascii',
      name: 'AnyAscii JS',
      kind: 'package',
      package: 'any-ascii',
      style: 'default',
      modes: ['transliterate'],
      options: 'Defaults',
    },
    {
      id: 'unidecode',
      name: 'Unidecode JS',
      kind: 'package',
      package: 'unidecode',
      style: 'default',
      modes: ['transliterate'],
      options: 'Defaults',
    },
    {
      id: 'sindre-transliterate',
      name: 'Sindre transliterate',
      kind: 'package',
      package: '@sindresorhus/transliterate',
      style: 'default',
      modes: ['transliterate'],
      options: 'Defaults, including normalization',
    },
    {
      id: 'pinyin-pro',
      name: 'pinyin-pro',
      kind: 'package',
      package: 'pinyin-pro',
      style: 'pinyin',
      modes: ['transliterate'],
      options: "{ toneType: 'none', nonZh: 'consecutive' }",
    },
    {
      id: 'slugify',
      name: 'slugify JS',
      kind: 'package',
      package: 'slugify',
      style: 'slugify',
      modes: ['slugify'],
      options: '{ lower: true, strict: true }',
    },
    {
      id: 'slug',
      name: 'slug',
      kind: 'package',
      package: 'slug',
      style: 'slug',
      modes: ['slugify'],
      options: 'Defaults, fallback encoding enabled; no whole-input cache',
    },
    {
      id: 'speakingurl',
      name: 'speakingurl',
      kind: 'package',
      package: 'speakingurl',
      style: 'default',
      modes: ['slugify'],
      options: 'Defaults',
    },
    {
      id: 'sindre-slugify',
      name: 'Sindre slugify',
      kind: 'package',
      package: '@sindresorhus/slugify',
      style: 'default',
      modes: ['slugify'],
      options: 'Defaults, including decamelization',
    },
    {
      id: 'limax',
      name: 'limax',
      kind: 'package',
      package: 'limax',
      style: 'default',
      modes: ['slugify'],
      options: 'Defaults, language detection and Pinyin tone numbers',
    },
  ];
  if (snapshot) {
    for (const map of ['full', 'latin'] satisfies ('full' | 'latin')[])
      result.push({
        id: `snapshot-${map}`,
        name: `Pre-optimization ${map}`,
        kind: 'local',
        root: snapshot,
        map,
        role: 'snapshot',
        modes: ['transliterate', 'slugify'],
        options: 'Immediate pre-optimization frozen distribution, defaults',
      });
  }
  return result;
}
export const nativeAdapters: NativeAdapter[] = [
  {
    id: 'python-unidecode',
    name: 'Unidecode Py',
    kind: 'native',
    runtime: 'python',
    modes: ['transliterate'],
    options: 'Defaults',
  },
  {
    id: 'python-text-unidecode',
    name: 'text-unidecode Py',
    kind: 'native',
    runtime: 'python',
    modes: ['transliterate'],
    options: 'Defaults',
  },
  {
    id: 'python-anyascii',
    name: 'AnyAscii Py',
    kind: 'native',
    runtime: 'python',
    modes: ['transliterate'],
    options: 'Defaults',
  },
  {
    id: 'python-slugify',
    name: 'python-slugify',
    kind: 'native',
    runtime: 'python',
    modes: ['slugify'],
    options:
      'Default legacy algorithm, auto backend selects installed Unidecode',
  },
  {
    id: 'rust-deunicode',
    name: 'deunicode Rust',
    kind: 'native',
    runtime: 'rust',
    modes: ['transliterate'],
    options: 'Release opt3, LTO, codegen-units1',
  },
  {
    id: 'rust-anyascii',
    name: 'AnyAscii Rust',
    kind: 'native',
    runtime: 'rust',
    modes: ['transliterate'],
    options: 'Release opt3, LTO, codegen-units1',
  },
  {
    id: 'icu',
    name: 'ICU C++',
    kind: 'native',
    runtime: 'icu',
    modes: ['transliterate'],
    options:
      'Any-Latin; Latin-ASCII, persistent native converter, UTF conversion included',
  },
];
function nodeTarget(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object') return undefined;
  const record = object(value);
  for (const condition of ['node', 'import', 'require', 'default']) {
    const target = nodeTarget(record[condition]);
    if (target) return target;
  }
  return undefined;
}
export function resolveAdapter(adapter: NodeAdapter): {
  entry: string;
  package: string;
  version: string;
} {
  if (adapter.kind === 'local') {
    const metadata = object(
      parse(
        readFileSync(
          path.join(
            adapter.role === 'snapshot' ? repository : adapter.root,
            'package.json'
          ),
          'utf8'
        )
      )
    );
    const entry = path.join(
      adapter.root,
      adapter.role === 'snapshot' ? '' : 'dist',
      'node/src/node',
      adapter.map === 'full' ? 'index.js' : 'latin.js'
    );
    return {
      entry,
      package: text(metadata.name),
      version: text(metadata.version),
    };
  }
  return resolvePackage(adapter.package);
}
function readPackageMetadata(
  file: string
): Record<string, unknown> | undefined {
  try {
    return object(parse(readFileSync(file, 'utf8')));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return undefined;
    throw error;
  }
}
function resolvePackage(packageName: string): {
  entry: string;
  package: string;
  version: string;
} {
  let entry = require.resolve(packageName);
  let parent = path.dirname(entry);
  for (;;) {
    const metadata = readPackageMetadata(path.join(parent, 'package.json'));
    if (metadata?.name === packageName) {
      const exports = metadata.exports;
      const root =
        exports !== null && typeof exports === 'object'
          ? (object(exports)['.'] ?? exports)
          : exports;
      const target = nodeTarget(root);
      if (target) entry = path.resolve(parent, target);
      return { entry, package: packageName, version: text(metadata.version) };
    }
    const next = path.dirname(parent);
    if (next === parent)
      throw new Error(`Cannot locate package metadata: ${packageName}`);
    parent = next;
  }
}
export async function loadAdapter(
  adapter: NodeAdapter,
  entry: string
): Promise<Api> {
  const loaded: unknown = await import(pathToFileURL(entry).href);
  const module = object(loaded);
  if (adapter.kind === 'local') {
    const api = isCallable(module.transliterate)
      ? module
      : object(module.default);
    return {
      methods: {
        transliterate: callable(api.transliterate),
        slugify: callable(api.slugify),
      },
    };
  }
  if (adapter.style === 'pinyin') {
    const convert = callable(module.pinyin ?? object(module.default).pinyin);
    return {
      methods: {
        transliterate: (input) =>
          convert(input, { toneType: 'none', nonZh: 'consecutive' }),
      },
    };
  }
  const convert = callable(module.default);
  if (adapter.style === 'slugify')
    return {
      methods: {
        slugify: (input) => convert(input, { lower: true, strict: true }),
      },
    };
  return {
    methods: { [adapter.modes[0]]: convert },
    ...(adapter.style === 'slug'
      ? {
          isFallback: (input: string, output: string) =>
            output !== '' && convert(input, { fallback: false }) === '',
        }
      : {}),
  };
}
export function metadata(
  adapter: NodeAdapter,
  resolved: ReturnType<typeof resolveAdapter>,
  digest: string
): Metadata {
  return {
    id: adapter.id,
    name: adapter.name,
    package: resolved.package,
    version: resolved.version,
    displayVersion:
      adapter.kind === 'local' && adapter.role === 'after'
        ? 'next (unreleased)'
        : resolved.version,
    runtime: `Node ${process.version}`,
    options: adapter.options,
    entry: path.relative(repository, resolved.entry),
    entrySha256: digest,
    modes: adapter.modes,
  };
}
