import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, openSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { installPackedPackage } from '../../test/package-helpers.mjs';
const directory = dirname(fileURLToPath(import.meta.url));
const archive = process.argv[2] ?? join(directory, 'after.tgz');
process.env.TRANSLITERATION_TARBALL = archive;
const installed = installPackedPackage(join(directory, '../..'));
const api = installed.require('transliteration');
const result = {runtime:process.version,archive,archiveSha256:createHash('sha256').update((await import('node:fs')).readFileSync(archive)).digest('hex'),deadlineMs:5000,maxBufferBytes:1024*1024,cases:[]};
try {
  for(const [name,input] of [['slugify',`${'a '.repeat(60000)}b`],['transliterate','你好'.repeat(24000)]]) {
    const file = join(installed.directory, 'input.txt');
    writeFileSync(file,input);
    const fd = openSync(file,'r');
    let child;
    const start = performance.now();
    try { child = spawnSync(process.execPath,[join(installed.root,'dist/bin',name),'-S'],{cwd:installed.consumer,encoding:'utf8',timeout:5000,maxBuffer:1024*1024,stdio:[fd,'pipe','pipe']}); }
    finally { closeSync(fd); }
    const elapsedMs = performance.now()-start;
    const expected = `${api[name](input)}\n`;
    result.cases.push({name,inputBytes:Buffer.byteLength(input),elapsedMs,error:child.error ? {name:child.error.name,code:child.error.code,message:child.error.message} : null,signal:child.signal,status:child.status,stdoutBytes:Buffer.byteLength(child.stdout ?? ''),stderr:child.stderr,expectedBytes:Buffer.byteLength(expected),exactOutput:child.stdout===expected});
  }
} finally { installed.cleanup(); }
writeFileSync(join(directory,`stdin-diagnostic-${archive.endsWith('before.tgz')?'before':'after'}.json`),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
assert.ok(result.cases.every(item=>item.status===0&&item.exactOutput));
