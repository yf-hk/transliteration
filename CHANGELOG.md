# Changelog

## 2.4.0

- Modernized toolchain: migrated from Rollup/Babel to tsup/Bun for faster builds
- Added comprehensive test suites with 100% code coverage
- Fixed slugify to collapse consecutive separators (e.g., `hello---world` → `hello-world`)
- Fixed slugify to properly strip leading/trailing separators
- Replaced TSLint/Prettier with Biome for linting
- Minimum Node.js requirement is now v20.0.0
- Refactored utilities and added edge case handling
- Added Vitest as modern test runner with jsdom environment for browser tests

## 2.2.0

- Fixed data issue (#229)
- Added `fixChineseSpacing` option for improving performance with non-Chinese languages
- Fixed replace-related issues (#202)
- Updated dependencies

## 2.1.0

- Added `transliterate` as a global variable for browser builds (kept `transl` for backward compatibility)

## 2.0.0

- **Breaking**: CDN file structure changed — see [jsDelivr](https://www.jsdelivr.com/package/npm/transliteration)
- Refactored entire module in TypeScript with significant performance improvements and reduced package size
- Improved code quality with 100% unit test coverage
- Dropped `bower` support — use CDN or bundlers like webpack/rollup instead
- Per RFC 3986, more characters (`a-zA-Z0-9-_.~`) are now allowed in `slugify` output (configurable)
- Added `uppercase` option for `slugify` to convert output to uppercase
- Unknown characters are now transliterated as empty string by default (previously `[?]`)

## 1.6.6

- Added TypeScript support (#77)

## 1.5.0

- Minimum Node.js requirement: v6.0+

## 1.0.0

- **Breaking**: Entire codebase refactored — upgrade carefully from v0.1.x or v0.2.x
- The `options` parameter of `transliterate` is now an object (previously a string for `unknown`)
- Added `transliterate.config()` and `slugify.config()` methods
- Unknown characters are now transliterated as `[?]` instead of `?`
- Browser global variables changed to `window.transl` and `window.slugify` (other globals removed)
