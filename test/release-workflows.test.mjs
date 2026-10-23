import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { installPackedPackage } from './package-helpers.mjs';

const build = readFileSync(
  new URL('../.github/workflows/build.yml', import.meta.url),
  'utf8'
);
const release = readFileSync(
  new URL('../.github/workflows/release.yml', import.meta.url),
  'utf8'
);

function command(workflow, name) {
  const step = workflow
    .split(/^ {6}- /m)
    .find((block) => block.startsWith(`name: ${name}\n`));
  assert.ok(step, `Missing workflow step: ${name}`);
  const run = step.match(/\n {8}run: \|\n([\s\S]*)/);
  assert.ok(run, `Missing shell block: ${name}`);
  return run[1]
    .split('\n')
    .map((line) => line.slice(10))
    .join('\n');
}

function fixture(t, packed = {}) {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'transliteration-release-'))
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const manifest = {
    name: 'transliteration-workflow-fixture',
    version: '1.2.3',
    scripts: Object.fromEntries(
      [
        'prepare',
        'prepack',
        'postpack',
        'prepublishOnly',
        'publish',
        'postpublish',
      ].map((name) => [
        name,
        "node -e \"require('node:fs').writeFileSync('lifecycle-ran', 'yes')\"",
      ])
    ),
  };
  mkdirSync(join(directory, 'package'));
  mkdirSync(join(directory, 'artifacts'));
  writeFileSync(join(directory, 'package.json'), JSON.stringify(manifest));
  writeFileSync(
    join(directory, 'package/package.json'),
    JSON.stringify({ ...manifest, ...packed })
  );
  writeFileSync(join(directory, 'package/archive-only.txt'), 'tested bytes');
  writeFileSync(
    join(directory, 'checkout-only.txt'),
    'unpacked checkout bytes'
  );
  const archive = 'artifacts/workflow-package-1.2.3.tgz';
  const tar = spawnSync('tar', ['-czf', archive, 'package'], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.equal(tar.status, 0, tar.stderr);
  const checksum = createHash('sha256')
    .update(readFileSync(join(directory, archive)))
    .digest('hex');
  writeFileSync(
    join(directory, 'artifacts/SHA256SUMS'),
    `${checksum}  ${archive}\n`
  );
  return { directory, archive, output: join(directory, 'output'), manifest };
}

function run(workflow, name, archiveFixture, env = {}) {
  const result = spawnSync(
    'bash',
    [
      '--noprofile',
      '--norc',
      '-e',
      '-o',
      'pipefail',
      '-c',
      command(workflow, name),
    ],
    {
      cwd: archiveFixture.directory,
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        NODE_TEST_CONTEXT: undefined,
        GITHUB_OUTPUT: archiveFixture.output,
        ...env,
      },
    }
  );
  assert.equal(result.error, undefined);
  return result;
}

test('release consumes the triggering successful push and tested archive', () => {
  assert.match(release, /workflow_run\.conclusion == 'success'/);
  assert.match(release, /workflow_run\.event == 'push'/);
  assert.match(release, /workflow_run\.head_branch == 'main'/);
  assert.match(
    release,
    /workflow_run\.head_repository\.full_name == github\.repository/
  );
  assert.match(
    release,
    /ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/
  );
  assert.match(release, /run-id: \$\{\{ github\.event\.workflow_run\.id \}\}/);
  assert.match(release, /github-token: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(release, /actions: read/);
  assert.match(release, /id-token: write/);
  assert.match(release, /digest-mismatch: error/);
  assert.match(
    command(release, 'Publish to npm'),
    /--ignore-scripts --provenance/
  );
  assert.doesNotMatch(release, /setup-bun|bun install|npm (?:ci|pack)|bun run/);
  assert.equal(build.match(/npm pack/g)?.length, 1);
  assert.match(build, /TRANSLITERATION_TARBALL=.*\$GITHUB_ENV/);
  assert.ok(build.indexOf('Pack the build once') < build.indexOf('test:unit'));
});

test('release verifies archive bytes and checked-out package identity', (t) => {
  const archiveFixture = fixture(t);
  const result = run(release, 'Verify the tested archive', archiveFixture);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(archiveFixture.output, 'utf8'),
    `version=1.2.3\narchive=${archiveFixture.archive}\n`
  );
});

test('package helpers install the supplied archive when the checkout differs', (t) => {
  const archiveFixture = fixture(t, { name: 'transliteration' });
  const previous = process.env.TRANSLITERATION_TARBALL;
  process.env.TRANSLITERATION_TARBALL = join(
    archiveFixture.directory,
    archiveFixture.archive
  );
  let installed;
  try {
    installed = installPackedPackage(archiveFixture.directory);
  } finally {
    if (previous === undefined) delete process.env.TRANSLITERATION_TARBALL;
    else process.env.TRANSLITERATION_TARBALL = previous;
  }
  t.after(installed.cleanup);
  assert.equal(installed.manifest.name, 'transliteration');
  assert.equal(
    readFileSync(join(installed.root, 'archive-only.txt'), 'utf8'),
    'tested bytes'
  );
  assert.equal(existsSync(join(installed.root, 'checkout-only.txt')), false);
});

for (const step of [
  'Test the archive',
  'Test the archive without development dependencies',
]) {
  test(`${step} passes the verified tarball to package tests`, (t) => {
    const archiveFixture = fixture(t);
    mkdirSync(join(archiveFixture.directory, 'test'));
    writeFileSync(
      join(archiveFixture.directory, 'test/package.test.mjs'),
      "import { writeFileSync } from 'node:fs';\n" +
        "writeFileSync('tested-archive', process.env.TRANSLITERATION_TARBALL);\n"
    );
    writeFileSync(
      join(archiveFixture.directory, 'package.json'),
      JSON.stringify({
        ...archiveFixture.manifest,
        scripts: { 'test:package': 'node --test test/package.test.mjs' },
      })
    );
    const result = run(build, step, archiveFixture);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const marker = join(archiveFixture.directory, 'tested-archive');
    assert.ok(existsSync(marker), result.stdout + result.stderr);
    assert.equal(
      readFileSync(marker, 'utf8'),
      join(archiveFixture.directory, archiveFixture.archive)
    );
    rmSync(marker);
    appendFileSync(
      join(archiveFixture.directory, archiveFixture.archive),
      'changed'
    );
    assert.notEqual(run(build, step, archiveFixture).status, 0);
    assert.equal(existsSync(marker), false);
  });
}

for (const [name, version] of [
  ['another-package', '1.2.3'],
  ['transliteration-workflow-fixture', '9.9.9'],
]) {
  test(`release rejects mismatched identity ${name}@${version}`, (t) => {
    const archiveFixture = fixture(t, { name, version });
    const result = run(release, 'Verify the tested archive', archiveFixture);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(archiveFixture.output), false);
  });
}

for (const mutation of ['tampered', 'duplicate', 'missing', 'wrong manifest']) {
  test(`release rejects ${mutation} archives before publication`, (t) => {
    const archiveFixture = fixture(t);
    const archive = join(archiveFixture.directory, archiveFixture.archive);
    if (mutation === 'tampered') appendFileSync(archive, 'changed bytes');
    if (mutation === 'duplicate') {
      copyFileSync(
        archive,
        join(archiveFixture.directory, 'artifacts/extra.tgz')
      );
    }
    if (mutation === 'missing') rmSync(archive);
    if (mutation === 'wrong manifest') {
      appendFileSync(
        join(archiveFixture.directory, 'artifacts/SHA256SUMS'),
        '\n'
      );
    }
    const result = run(release, 'Verify the tested archive', archiveFixture);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(archiveFixture.output), false);
  });
}

test('publication rechecks the archive and dry-runs without lifecycle scripts', (t) => {
  const archiveFixture = fixture(t);
  const archive = join(archiveFixture.directory, archiveFixture.archive);
  const original = readFileSync(archive);
  const result = run(release, 'Publish to npm', archiveFixture, {
    ARCHIVE: archiveFixture.archive,
    npm_config_dry_run: 'true',
    npm_config_json: 'true',
    npm_config_offline: 'true',
    npm_config_update_notifier: 'false',
    npm_config_registry: 'http://127.0.0.1:9/',
    npm_config_cache: join(archiveFixture.directory, 'npm-cache'),
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const published = JSON.parse(result.stdout)[archiveFixture.manifest.name];
  assert.equal(published.name, archiveFixture.manifest.name);
  assert.equal(published.version, archiveFixture.manifest.version);
  assert.equal(
    published.shasum,
    createHash('sha1').update(original).digest('hex')
  );
  assert.ok(published.files.some((file) => file.path === 'archive-only.txt'));
  assert.ok(!published.files.some((file) => file.path === 'checkout-only.txt'));
  assert.equal(
    existsSync(join(archiveFixture.directory, 'lifecycle-ran')),
    false
  );
  assert.deepEqual(readFileSync(archive), original);

  appendFileSync(archive, 'changed after verification');
  const tampered = run(release, 'Publish to npm', archiveFixture, {
    ARCHIVE: archiveFixture.archive,
    npm_config_dry_run: 'true',
    npm_config_offline: 'true',
  });
  assert.notEqual(tampered.status, 0);
});
