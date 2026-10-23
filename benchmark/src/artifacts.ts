import { readFileSync } from 'node:fs';
import path from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { object, parse } from './json.js';
import { repository } from './paths.js';
import { hash } from './provenance.js';
import type { Artifact } from './types.js';

export function measureBrowserArtifacts(): Artifact[] {
  const metadata = object(
    parse(readFileSync(path.join(repository, 'package.json'), 'utf8'))
  );
  const exports = object(metadata.exports);
  const latin = object(exports['./latin']);
  const candidates = [
    metadata.browser,
    metadata.module,
    metadata.jsdelivr,
    metadata.unpkg,
    latin.browser,
  ].filter(
    (value): value is string =>
      typeof value === 'string' && /\.(?:m?js|cjs)$/u.test(value)
  );
  return [...new Set(candidates)].map((file) => {
    const absolute = path.resolve(repository, file);
    const bytes = readFileSync(absolute);
    return {
      file,
      rawBytes: bytes.length,
      gzipBytes: gzipSync(bytes, { level: 9 }).length,
      brotliBytes: brotliCompressSync(bytes, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
      }).length,
      sha256: hash(absolute),
    };
  });
}
