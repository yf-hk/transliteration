import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const npm = (args, cwd) => {
  const result = spawnSync('npm', args, {
    cwd,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 5 * 1024 * 1024,
    env: { ...process.env, npm_config_update_notifier: 'false' },
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
};

export function installPackedPackage(repositoryRoot) {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'transliteration-package-'))
  );
  const cleanup = () => rmSync(directory, { recursive: true, force: true });

  try {
    let tarball;
    if (process.env.TRANSLITERATION_TARBALL) {
      tarball = resolve(process.env.TRANSLITERATION_TARBALL);
      assert.ok(statSync(tarball).isFile(), `${tarball} is not a tarball file`);
    } else {
      const packed = JSON.parse(
        npm(
          [
            'pack',
            '--ignore-scripts',
            '--json',
            '--pack-destination',
            directory,
          ],
          repositoryRoot
        )
      );
      assert.equal(packed.length, 1, 'Expected exactly one packed package');
      tarball = join(directory, packed[0].filename);
    }

    const consumer = join(directory, 'consumer');
    mkdirSync(consumer);
    writeFileSync(
      join(consumer, 'package.json'),
      JSON.stringify({
        name: 'transliteration-package-consumer',
        private: true,
      })
    );
    npm(
      [
        'install',
        tarball,
        '--offline',
        '--omit=dev',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--no-package-lock',
        '--cache',
        join(directory, 'npm-cache'),
      ],
      consumer
    );

    const root = join(consumer, 'node_modules', 'transliteration');
    const manifest = JSON.parse(
      readFileSync(join(root, 'package.json'), 'utf8')
    );
    const require = createRequire(join(consumer, 'package.json'));
    return { directory, consumer, root, manifest, require, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
}
