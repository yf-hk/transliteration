import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { object, parse, text } from './json.js';
import { directory, repository } from './paths.js';
import type { Provenance } from './types.js';

export const hash = (file: string): string =>
  createHash('sha256').update(readFileSync(file)).digest('hex');
export function tree(base: string): Record<string, string> {
  const files: Record<string, string> = {};
  function visit(relative: string): void {
    for (const entry of readdirSync(path.join(base, relative), {
      withFileTypes: true,
    })) {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile()) files[name] = hash(path.join(base, name));
    }
  }
  visit('');
  return files;
}
export function capture(
  before: string,
  archive: string | undefined,
  versions: Record<string, string>
): Provenance {
  const packageMetadata = object(
    parse(readFileSync(path.join(repository, 'package.json'), 'utf8'))
  );
  const baseline = object(
    parse(readFileSync(path.join(before, 'package.json'), 'utf8'))
  );
  const dist = tree(path.join(repository, 'dist'));
  let proof: Provenance['archive'] = null;
  if (archive) {
    for (const [name, digest] of Object.entries(dist)) {
      const packed = execFileSync('tar', [
        '-xOf',
        archive,
        `package/dist/${name}`,
      ]);
      if (createHash('sha256').update(packed).digest('hex') !== digest)
        throw new Error(`Archive/dist mismatch: ${name}`);
    }
    proof = {
      path: path.relative(repository, archive),
      bytes: statSync(archive).size,
      sha256: hash(archive),
      allDistFilesMatch: true,
    };
  }
  const toolVersions = Object.fromEntries(
    ['typescript', 'tsdown', '@biomejs/biome'].map((name) => [
      name,
      text(
        object(
          parse(
            readFileSync(
              path.join(repository, 'node_modules', name, 'package.json'),
              'utf8'
            )
          )
        ).version
      ),
    ])
  );
  return {
    createdAt: new Date().toISOString(),
    head: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repository,
      encoding: 'utf8',
    }).trim(),
    trackedDirty:
      execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
        cwd: repository,
        encoding: 'utf8',
      }).trim() !== '',
    packageVersion: text(packageMetadata.version),
    source: tree(path.join(repository, 'src')),
    dist,
    harness: {
      ...Object.fromEntries(
        Object.entries(tree(path.join(directory, 'src'))).map(
          ([name, digest]) => [`src/${name}`, digest]
        )
      ),
      ...Object.fromEntries(
        Object.entries(tree(path.join(directory, 'native'))).map(
          ([name, digest]) => [`native/${name}`, digest]
        )
      ),
      ...Object.fromEntries(
        readdirSync(path.join(directory, '.build'))
          .filter((name) => name.endsWith('.js'))
          .map((name) => [
            `.build/${name}`,
            hash(path.join(directory, '.build', name)),
          ])
      ),
      'package-lock.json': hash(path.join(directory, 'package-lock.json')),
      'tsconfig.json': hash(path.join(directory, 'tsconfig.json')),
    },
    baseline: {
      root: path.relative(repository, before),
      version: text(baseline.version),
      entries: Object.fromEntries(
        ['index', 'latin'].map((name) => [
          `${name}.js`,
          hash(path.join(before, 'dist/node/src/node', `${name}.js`)),
        ])
      ),
    },
    archive: proof,
    versions: { node: process.version, ...toolVersions, ...versions },
    hostProcesses: execFileSync('ps', ['-Ao', 'pid,pcpu,comm', '-r'], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .slice(0, 9),
  };
}
