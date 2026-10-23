import { defineConfig, type UserConfig } from 'tsdown';

const common = {
  clean: false,
  minify: true,
  target: 'es2020',
  outDir: 'dist',
  sourcemap: true,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
} satisfies UserConfig;

const browserFooter =
  "if(typeof module==='object'&&module.exports){module.exports=transliteration;}else if(typeof define==='function'&&define.amd){define(function(){return transliteration;});}else{Object.assign(globalThis,transliteration);}";

// Keep Unicode mapping keys quoted for runtimes with older identifier tables.
const latinMinify = { compress: false };

export default defineConfig([
  ...['index', 'latin'].map(
    (name): UserConfig => ({
      ...common,
      entry: { [`node/src/node/${name}`]: `src/node/${name}.ts` },
      format: 'cjs',
      platform: 'node',
      minify: name === 'latin' ? latinMinify : true,
      dts: { sourcemap: false },
      outputOptions: (options, _format, { cjsDts }) => ({
        ...options,
        entryFileNames: '[name].js',
        sourcemap: !cjsDts,
      }),
    })
  ),
  ...['index', 'latin'].flatMap((name): UserConfig[] => {
    const base = name === 'index' ? 'bundle' : 'latin';
    return [
      {
        ...common,
        entry: { [`browser/${base}.esm.min`]: `src/browser/${name}.ts` },
        format: 'esm',
        platform: 'browser',
        minify: name === 'latin' ? latinMinify : true,
        dts: false,
        outputOptions: { entryFileNames: '[name].js', codeSplitting: false },
      },
      {
        ...common,
        entry: { [`browser/${base}.umd.min`]: `src/browser/${name}.ts` },
        format: 'iife',
        platform: 'browser',
        minify: name === 'latin' ? latinMinify : true,
        dts: false,
        outputOptions: {
          entryFileNames: '[name].js',
          name: 'transliteration',
          footer: browserFooter,
          codeSplitting: false,
        },
      },
    ];
  }),
  ...['transliterate', 'slugify'].map(
    (name): UserConfig => ({
      ...common,
      entry: { [`bin/${name}`]: `src/cli/${name}.ts` },
      format: 'cjs',
      platform: 'node',
      dts: false,
      sourcemap: false,
      outputOptions: { entryFileNames: '[name]' },
    })
  ),
]);
