import { defineConfig, type Options } from 'tsup';

const common = {
  minify: true,
  target: 'es2020',
} as const;

export const nodeConfig: Options = {
  entry: { 'node/src/node/index': 'src/node/index.ts' },
  format: ['cjs'],
  dts: true,
  sourcemap: true,
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  ...common,
};

export const browserEsmConfig: Options = {
  entry: { 'browser/bundle.esm.min': 'src/browser/index.ts' },
  format: ['esm'],
  dts: false,
  sourcemap: true,
  platform: 'browser',
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  ...common,
};

export const browserUmdConfig: Options = {
  entry: { 'browser/bundle.umd.min': 'src/browser/index.ts' },
  format: ['iife'],
  dts: false,
  sourcemap: true,
  platform: 'browser',
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  globalName: 'transliteration',
  ...common,
};

export const cliConfig: Options = {
  entry: {
    'bin/transliterate': 'src/cli/transliterate.ts',
    'bin/slugify': 'src/cli/slugify.ts',
  },
  format: ['cjs'],
  sourcemap: false,
  banner: { js: '#!/usr/bin/env node' },
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  ...common,
};

export default defineConfig([nodeConfig, browserEsmConfig, browserUmdConfig, cliConfig]);
