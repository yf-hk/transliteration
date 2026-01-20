# Changelog

## 2.6.1

- **Fix**: Added `transliteration/latin` entrypoint with proper `exports` mapping
- **Fix**: Preserved access to `dist/*` and `package.json` for tooling/CDN usage
- **Fix**: Latin-only build now resets to Latin data on `setData(..., true)`

## 2.6.0

- **Fix**: Restored v2.3.5 compatible dist file structure for backward compatibility
  - `dist/node/src/node/index.js` (main, CJS)
  - `dist/browser/bundle.esm.min.js` (module, ESM)
  - `dist/browser/bundle.umd.min.js` (browser, UMD/IIFE)
  - `dist/bin/transliterate` and `dist/bin/slugify` (CLI)

## 2.5.0

- **Performance**: Switched to 2D array lookup for ~26% faster transliteration
- **New Feature**: Added Latin-only build (`transliteration/latin`) for minimal bundle size (~5 KB vs ~186 KB)
- **Optimization**: Korean Hangul characters now computed algorithmically at runtime (saves 11,172 entries)
- **Internal**: Refactored charmap data structure into chunked files for better tree-shaking
- **Caveat**: Dist file structure changed from v2.3.5 — upgrade to v2.6.0 for compatibility

## 2.4.0

- **Tooling**: Migrated from Rollup/Babel to tsup/Bun for faster builds
- **Testing**: Added comprehensive test suites with 100% code coverage
- **Fix**: Slugify now collapses consecutive separators (e.g., `hello---world` → `hello-world`)
- **Fix**: Slugify now properly strips leading/trailing separators
- **Tooling**: Replaced TSLint/Prettier with Biome for linting
- **Breaking**: Minimum Node.js requirement is now v20.0.0
- **Internal**: Refactored utilities and added edge case handling
- **Testing**: Added Vitest as modern test runner with jsdom environment for browser tests
- **Caveat**: Dist file structure changed from v2.3.5 — upgrade to v2.6.0 for compatibility

## 2.2.0

- **Fix**: Fixed data issue (#229)
- **New Feature**: Added `fixChineseSpacing` option for improving performance with non-Chinese languages
- **Fix**: Fixed replace-related issues (#202)
- **Internal**: Updated dependencies

## 2.1.0

- **New Feature**: Added `transliterate` as a global variable for browser builds (kept `transl` for backward compatibility)

## 2.0.0

- **Breaking**: CDN file structure changed — see [jsDelivr](https://www.jsdelivr.com/package/npm/transliteration)
- **Performance**: Refactored entire module in TypeScript with significant performance improvements and reduced package size
- **Testing**: Improved code quality with 100% unit test coverage
- **Breaking**: Dropped `bower` support — use CDN or bundlers like webpack/rollup instead
- **New Feature**: Per RFC 3986, more characters (`a-zA-Z0-9-_.~`) are now allowed in `slugify` output (configurable)
- **New Feature**: Added `uppercase` option for `slugify` to convert output to uppercase
- **Breaking**: Unknown characters are now transliterated as empty string by default (previously `[?]`)

## 1.6.6

- **New Feature**: Added TypeScript support (#77)

## 1.5.0

- **Breaking**: Minimum Node.js requirement: v6.0+

## 1.0.0

- **Breaking**: Entire codebase refactored — upgrade carefully from v0.1.x or v0.2.x
- **Breaking**: The `options` parameter of `transliterate` is now an object (previously a string for `unknown`)
- **New Feature**: Added `transliterate.config()` and `slugify.config()` methods
- **Breaking**: Unknown characters are now transliterated as `[?]` instead of `?`
- **Breaking**: Browser global variables changed to `window.transl` and `window.slugify` (other globals removed)
