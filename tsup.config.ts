import { defineConfig, type Options } from 'tsup';

const common = {
  minify: true,
  target: 'es2020',
  outDir: 'dist',
} as const;

export const nodeConfig: Options = {
  entry: { index: 'src/node/index.ts' },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  ...common,
};

export const browserConfig: Options = {
  entry: { browser: 'src/browser/index.ts' },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  platform: 'browser',
  ...common,
};

export const cliConfig: Options = {
  entry: {
    'cli/transliterate': 'src/cli/transliterate.ts',
    'cli/slugify': 'src/cli/slugify.ts',
  },
  format: ['cjs'],
  sourcemap: false,
  banner: { js: '#!/usr/bin/env node' },
  ...common,
};

// Default export for parallel builds (may have race conditions)
// Use individual exports with build script for sequential builds
export default defineConfig([nodeConfig, browserConfig, cliConfig]);
