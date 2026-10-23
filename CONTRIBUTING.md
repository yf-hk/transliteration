# Development

The published library supports Node.js 20 and newer and has no runtime package
dependencies. Development uses Node.js 26 and Bun 1.4.4. Node.js 22.18+ or 24.11+
also satisfies the build tool's requirements.

```sh
bun install --frozen-lockfile
bun run check
```

`check` generates the mapping data, builds every distribution, runs unit tests
with coverage and packed-package tests, then checks types and formatting.

## Toolchain

The versions below were checked against their published releases on 2026-10-23
and are pinned in `package.json` and `bun.lock`.

| Tool | Version | Purpose |
| --- | --- | --- |
| Bun | 1.4.4 | Install packages, run TypeScript scripts and unit tests, collect coverage |
| TypeScript | 7.0.2 | Type checking and declaration generation |
| tsdown | 0.23.1 | Bundle Node, browser and CLI distributions with Rolldown |
| Biome | 2.6.2 | Lint and format |
| `@types/bun` | 1.4.3 | Development runtime and test types |

TypeScript 7.0.2 is the stable `typescript` package, using the native compiler;
it is not the `@typescript/native-preview` package. tsdown currently labels its
TypeScript 7 integration experimental, so declaration generation remains part
of the build checks. `test/package-types.ts` compiles consumer calls through both
built package entry points. See the [TypeScript 7 release announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
and [tsdown declaration documentation](https://tsdown.dev/options/dts).

tsdown replaces tsup, whose [maintainer recommends moving to tsdown](https://github.com/egoist/tsup).
Bun's [test runner](https://bun.com/docs/test) and
[coverage support](https://bun.com/docs/test/code-coverage) replace Vitest and
its coverage package. Browser exports do not need a DOM emulator: unit tests
exercise their API, and package tests execute their actual script and module
formats in isolated contexts. Cleanup uses `node:fs`; JSON parsing uses built-in
APIs. Biome runs directly without a preset wrapper.

Latin bundles retain quoted mapping keys by disabling Rolldown's compression
pass while keeping whitespace and name minification. Removing those quotes can
produce Unicode identifiers that Node.js 20.0.0 cannot parse. The package matrix
checks the actual emitted bundles on that minimum runtime.

## Commands

```sh
bun run build          # Generate data and all distributions
bun run typecheck      # Check source, tests and build configuration
bun run test:unit      # Run source unit tests
bun run test:watch     # Watch source tests
bun run test:package   # Pack and test the built distribution
bun run test:coverage  # Build, collect unit coverage, test the package
bun run lint
bun run lint:fix
```

Run `build` before invoking `test:package` directly. Native coverage is written
to `coverage/lcov.info`; its totals cover loaded library modules and exclude
generated data, CLI subprocesses and test files. CLI behavior is checked by
source and packed-package subprocess tests.

## Package and CDN compatibility

The package tests create a tarball, install it offline with an empty npm cache
and no development dependencies, then exercise the installed exports and CLI.
They also check package contents, declaration paths, source maps, runtime
dependency metadata and browser loaders. CI builds with Node.js 26 and tests
that same archive on Node.js 20.0.0, 22, 24 and 26.

To test an existing archive without rebuilding or installing development tools:

```sh
TRANSLITERATION_TARBALL=/path/to/transliteration-2.7.0.tgz \
  node --test test/package.test.mjs
```

Keep these standalone browser paths and their `.map` files compatible:

| Build | Script / UMD | ES module |
| --- | --- | --- |
| Full | `dist/browser/bundle.umd.min.js` | `dist/browser/bundle.esm.min.js` |
| Latin | `dist/browser/latin.umd.min.js` | `dist/browser/latin.esm.min.js` |

Scripts expose the `transliteration` namespace and the global `transliterate`,
`slugify` and `transl` aliases; they also support CommonJS and AMD. ES modules
export those three names and need no sibling assets. Existing Node entry paths,
the `/latin` export and legacy `/dist/*` access are covered by package tests.

The explicit `jsdelivr` field selects the full UMD bundle, matching the existing
published default. jsDelivr gives that field priority over `browser` and `main`.
See [jsDelivr's default-file rules](https://github.com/jsdelivr/jsdelivr#configuring-a-default-file-in-packagejson).
Keep the README's versioned CDN URLs valid. After a future release, check the
exact published version and `X-JSD-Version` header: jsDelivr's version ranges can
[fall back to older files](https://github.com/jsdelivr/jsdelivr#npm), so a `200`
response alone does not prove the new archive contains a file.

## Benchmarks

Comparison packages are isolated in `benchmark/` and are never part of the
published library's dependency tree.

```sh
npm ci --prefix benchmark --include=dev
bun run build
bun run benchmark       # Quick smoke run
bun run benchmark:full  # Five rotated timing rounds
```

See [benchmark/README.md](benchmark/README.md) for filtering, output files,
measurement limits and interpretation of different transliteration coverage.
Keep builds, compression and other CPU work separate from timing runs.

## Releases

Keep the package version unchanged during ordinary development. The release
workflow checks out the exact commit that passed the complete build and
compatibility workflow, downloads that run's archive and verifies its SHA-256,
package name and version. The build packs once; archive tests, the Node.js
compatibility matrix and publication use that same tarball. Release publishing
uses OIDC and provenance with lifecycle scripts disabled, so it needs no Bun,
dependency installation or rebuild. Publishing and tagging are separate release
actions; local validation does not publish anything.
