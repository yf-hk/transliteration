<p align="center"><img src="https://yf-hk.github.io/transliteration/transliteration.png" alt="Transliteration"></p>

[![Build and Test](https://img.shields.io/github/actions/workflow/status/yf-hk/transliteration/build.yml?branch=main)](https://github.com/yf-hk/transliteration/actions/workflows/build.yml)
[![Coverage](https://codecov.io/gh/yf-hk/transliteration/graph/badge.svg)](https://codecov.io/gh/yf-hk/transliteration)
[![NPM Version](https://img.shields.io/npm/v/transliteration.svg)](https://www.npmjs.com/package/transliteration)
[![NPM Downloads](https://img.shields.io/npm/dm/transliteration.svg)](https://www.npmjs.com/package/transliteration)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/transliteration/badge)](https://www.jsdelivr.com/package/npm/transliteration)
[![License](https://img.shields.io/npm/l/transliteration.svg)](https://github.com/yf-hk/transliteration/blob/main/LICENSE.txt)

# Transliteration

A universal Unicode to Latin transliteration and slug generation library. Designed for cross-platform compatibility with comprehensive language support.

**[Live Demo →](https://yf-hk.github.io/transliteration)**

## Table of Contents

- [Features](#features)
- [Latin-Only Mode](#latin-only-mode)
- [Compatibility](#compatibility)
- [Installation](#installation)
- [Usage](#usage)
  - [transliterate()](#transliteratestr-options)
  - [slugify()](#slugifystr-options)
  - [CLI](#cli-usage)
- [Known Issues](#known-issues)
- [License](#license)

## Features

- **Unicode Transliteration** — Convert characters from any writing system to Latin equivalents
- **Slug Generation** — Create URL-safe and filename-safe strings from Unicode text
- **Highly Configurable** — Extensive options for custom replacements, ignored characters, and output formatting
- **Cross-Platform** — Runs seamlessly in Node.js, browsers, and command-line environments
- **TypeScript Ready** — Full type definitions included out of the box
- **Zero Dependencies** — Lightweight with no external runtime dependencies

## Latin-Only Mode

For applications that only need to transliterate Latin-based scripts (Western European languages), you can use the lightweight Latin-only build for significantly smaller bundle size:

```javascript
// Full build: ~195 KB minified, uncompressed (all scripts including CJK, Korean, etc.)
import { transliterate, slugify } from 'transliteration';

// Latin-only build: ~18 KB minified, uncompressed
import { transliterate, slugify } from 'transliteration/latin';
```

The Latin-only build supports:

- Basic ASCII (U+0000-U+007F)
- Latin-1 Supplement (U+0080-U+00FF)
- Latin Extended-A (U+0100-U+017F)
- Latin Extended-B (U+0180-U+024F)
- Mapped Latin characters in other blocks, including `ẞ`, `ᴀ` and `ₐ`
- Compatibility numbers that normalize to ASCII digits, such as `①`

This is ideal for applications that only handle Western European languages and want to minimize bundle size.

## Compatibility

- **Node.js**: v20.0.0 or higher
- **Browsers**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile**: React Native
- **Other**: Web Workers, CLI

## Installation

### Node.js / React Native

```bash
npm install transliteration
```

> **TypeScript:** Type definitions are bundled with this package. Do not install `@types/transliteration`.

**Quick Start:**

```javascript
import { transliterate as tr, slugify } from 'transliteration';

// Transliteration
tr('你好, world!');  // => 'Ni Hao , world!'

// Slugify
slugify('你好, world!');  // => 'ni-hao-world'
```

### Browser (CDN)

#### UMD Build (Global Variables)

```html
<script src="https://cdn.jsdelivr.net/npm/transliteration@2/dist/browser/bundle.umd.min.js"></script>
<script>
  // Available as global variables
  transliterate('你好, World');  // => 'Ni Hao, World'
  slugify('Hello, 世界');       // => 'hello-shi-jie'
  
  // Legacy method (will be removed in next major version)
  transl('Hola, mundo');       // => 'Hola, mundo'
</script>
```

#### ES Module

```html
<script type="module">
  import { transliterate } from 'https://cdn.jsdelivr.net/npm/transliteration@2/dist/browser/bundle.esm.min.js';
  console.log(transliterate('你好'));  // => 'Ni Hao'
</script>
```

### CLI

```bash
# Global installation
npm install transliteration -g

# Basic usage
transliterate 你好                # => Ni Hao
slugify 你好                      # => ni-hao

# Using stdin
echo 你好 | slugify -S           # => ni-hao
```

Stdin is buffered until EOF so replacements, ignored strings, and word boundaries behave the same as a direct API call.

## Usage

### transliterate(str, [options])

Converts Unicode characters in the input string to their Latin equivalents. Unrecognized characters are replaced with the `unknown` placeholder or removed if no placeholder is specified. Characters with an explicit empty mapping, including Cyrillic hard and soft signs, remain silent even when `unknown` is set. Empty mappings supplied through `setData()` also remove the character.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ignore` | `string[]` | `[]` | Strings to preserve without transliteration |
| `replace` | `object` or `array` | `{}` | Custom replacements applied before transliteration |
| `replaceAfter` | `object` or `array` | `{}` | Custom replacements applied after transliteration |
| `trim` | `boolean` | `false` | Trim leading and trailing whitespace from result |
| `unknown` | `string` | `''` | Replacement character for unrecognized Unicode |
| `fixChineseSpacing` | `boolean` | `true` | In text containing Chinese, separate Chinese characters and Latin/number runs |

#### Example

```javascript
import { transliterate as tr } from 'transliteration';

// Basic usage
tr('你好，世界');                  // => 'Ni Hao,Shi Jie'
tr('Γεια σας, τον κόσμο');        // => 'Geia sas, ton kosmo'
tr('안녕하세요, 세계');             // => 'annyeonghaseyo, segye'

// With options
tr('你好，世界', { 
  replace: { 你: 'You' }, 
  ignore: ['好'] 
});                              // => 'You 好, Shi Jie'

// Array form of replace option
tr('你好，世界', { 
  replace: [['你', 'You']], 
  ignore: ['好'] 
});                              // => 'You 好, Shi Jie'
```

### transliterate.config([optionsObj], [reset = false])

Sets global default options for all subsequent `transliterate()` calls. When called without arguments, returns the current configuration. Pass `reset = true` to restore factory defaults.

```javascript
// Set global configuration
tr.config({ replace: [['你', 'You']], ignore: ['好'] });

// All calls will use this configuration
tr('你好，世界');                  // => 'You 好, Shi Jie'

// View current configuration
console.log(tr.config());        // => { replace: [['你', 'You']], ignore: ['好'] }

// Reset to defaults
tr.config(undefined, true);
console.log(tr.config());        // => {}
```

### slugify(str, [options])

Transforms Unicode text into a URL-safe and filename-safe slug string.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ignore` | `string[]` | `[]` | Strings to preserve without transliteration |
| `replace` | `object` or `array` | `{}` | Custom replacements applied before transliteration |
| `replaceAfter` | `object` or `array` | `{}` | Custom replacements applied after transliteration |
| `trim` | `boolean` | `false` | Trim leading and trailing whitespace from result |
| `unknown` | `string` | `''` | Replacement character for unrecognized Unicode |
| `lowercase` | `boolean` | `true` | Convert output to lowercase |
| `uppercase` | `boolean` | `false` | Convert output to uppercase |
| `separator` | `string` | `-` | Word separator character |
| `allowedChars` | `string` | `a-zA-Z0-9-_.~'` | Regex character class for permitted characters |
| `fixChineseSpacing` | `boolean` | `true` | In text containing Chinese, separate Chinese characters and Latin/number runs |

#### Example

```javascript
// Basic usage
slugify('你好，世界');                // => 'ni-hao-shi-jie'

// With options
slugify('你好，世界', { 
  lowercase: false, 
  separator: '_' 
});                                // => 'Ni_Hao_Shi_Jie'

// Using replace option
slugify('你好，世界', {
  replace: { 
    你好: 'Hello', 
    世界: 'world' 
  },
  separator: '_'
});                                // => 'hello_world'

// Using ignore option
slugify('你好，世界', { 
  ignore: ['你好'] 
});                                // => '你好shi-jie'
```

`ignore` also applies when cleaning up transliterated text, so ignored strings can include generated Latin text. Case conversion still follows the `lowercase` and `uppercase` options.

With `fixChineseSpacing: true`, mixed Chinese, Latin and numeric runs form separate words:

```javascript
slugify('2022年中文01英文nihao02');
// => '2022-nian-zhong-wen-01-ying-wen-nihao-02'
slugify('hello世界'); // => 'hello-shi-jie'
slugify('hello世界', { fixChineseSpacing: false }); // => 'helloshijie'
slugify('iPhone15'); // => 'iphone15' (no Chinese in the input)
```

Omitting `allowedChars`, or passing `undefined`, uses the default character class. An explicit empty string still removes every non-ignored character.

### slugify.config([optionsObj], [reset = false])

Sets global default options for all subsequent `slugify()` calls. When called without arguments, returns the current configuration. Pass `reset = true` to restore factory defaults.

```javascript
// Set global configuration
slugify.config({ lowercase: false, separator: '_' });

// All calls will use this configuration
slugify('你好，世界');              // => 'Ni_Hao_Shi_Jie'

// View current configuration
console.log(slugify.config());    // => { lowercase: false, separator: "_" }

// Reset to defaults
slugify.config(undefined, true);
console.log(slugify.config());    // => {}
```

### CLI Usage

#### Transliterate Command

```
transliterate <unicode> [options]

Options:
  --version      Show version number                                   [boolean]
  -u, --unknown  Placeholder for unknown characters       [string] [default: ""]
  -r, --replace  Custom string replacement                 [array] [default: []]
  -i, --ignore   String list to ignore                     [array] [default: []]
  -S, --stdin    Use stdin as input                   [boolean] [default: false]
  -h, --help     Show help information                             [boolean]

Examples:
  transliterate "你好, world!" -r 好=good -r "world=Shi Jie"
  transliterate "你好，世界!" -i 你好 -i ，
```

#### Slugify Command

```
slugify <unicode> [options]

Options:
  --version        Show version number                                 [boolean]
  -U, --unknown    Placeholder for unknown characters     [string] [default: ""]
  -l, --lowercase  Returns result in lowercase         [boolean] [default: true]
  -u, --uppercase  Returns result in uppercase        [boolean] [default: false]
  -s, --separator  Separator of the slug                 [string] [default: "-"]
  -r, --replace    Custom string replacement               [array] [default: []]
  -i, --ignore     String list to ignore                   [array] [default: []]
  -S, --stdin      Use stdin as input                 [boolean] [default: false]
  -h, --help       Show help information                           [boolean]

Examples:
  slugify "你好, world!" -r 好=good -r "world=Shi Jie"
  slugify "你好，世界!" -i 你好 -i ，
```

## Known Issues

This library uses 1-to-1 Unicode code point mapping, which provides broad language coverage but has inherent limitations with context-dependent characters (e.g., polyphonic characters where pronunciation varies by context). Thorough testing with your target languages is recommended before production use.

**Language-Specific Limitations:**

| Language | Issue | Alternative |
|----------|-------|-------------|
| **Chinese** | Polyphonic characters may not transliterate correctly | [`pinyin`](https://www.npmjs.com/package/pinyin) |
| **Japanese** | Kanji characters often convert to Chinese Pinyin due to Unicode overlap | [`kuroshiro`](https://www.npmjs.com/package/kuroshiro) |
| **Thai** | Not working properly | [Issue #67](https://github.com/yf-hk/transliteration/issues/67) |
| **Cyrillic** | May be inaccurate for specific languages like Bulgarian | - |

For other issues or feature requests, please [open an issue](https://github.com/yf-hk/transliteration/issues).

## Development and benchmarks

See [CONTRIBUTING.md](CONTRIBUTING.md) for the toolchain, build commands and
package compatibility checks. Reproducible library comparisons are documented in
[benchmark/README.md](benchmark/README.md).

<!-- benchmark-results:start -->
## Performance

Before is the published **2.6.2** release. After is **next (unreleased)**; the working manifest is still 2.6.2. All JavaScript columns were rotated together. Python/Rust/ICU are separately timestamped synchronous resident-process string throughput; startup, IPC, bridge and network costs are excluded. Different runtimes include different string/result-consumption overhead.

The ASCII/Latin before/after fixtures have identical complete outputs (8/8 each). Observed gains:

| API / test | Before 2.6.2 k/s | After next k/s | Median gain |
| --- | ---: | ---: | ---: |
| transliterate / ascii | 237.6 (216.9–270.5) | 4,129.2 (3,621.9–4,345.6) | **17.38×** |
| transliterate / latin | 309.4 (256.9–345.0) | 962.4 (888.6–1,203.0) | **3.11×** |
| slugify / ascii | 78.8 (58.7–97.7) | 630.7 (495.0–749.4) | **8.00×** |
| slugify / latin | 77.8 (69.2–88.9) | 554.1 (372.8–641.4) | **7.13×** |

Thousands of complete strings/second; 5 rotated samples. **🏆** = highest eligible observed median; **≈** = overlapping ranges, so superiority is inconclusive. **†** = ineligible reading (dropped/retained/fallback text or failed reading probe). **‡** = limited reading probe passed, but complete outputs differ from After Full. A probe does not validate every pronunciation. No winner is awarded when every library fails a reading probe.

### Transliteration

| Test | Before Full 2.6.2 | After Full next (unreleased) | After Latin next (unreleased) | AnyAscii JS 0.3.3 | Unidecode JS 1.1.0 | Sindre transliterate 2.3.1 | pinyin-pro 3.29.5 | Unidecode Py 1.4.0 | text-unidecode Py 1.3 | AnyAscii Py 0.3.3 | deunicode Rust 1.6.2 | AnyAscii Rust 0.3.3 | ICU C++ 78.3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ascii | 237.6 | 4,129.2 | 4,082.6 | 834.6 | 2,366.6 | 517.8 | 72.5 | 1,757.6 | 216.2 | 2,039.9 | **🏆 8,261.2** | 2,131.0 | 51.6 |
| latin | 309.4 | 962.4 | 869.9 | 1,245.9 | 929.4 | 417.1‡ | 106.9† | 140.6 | 304.4 | 284.6 | 2,424.3 | **🏆 2,827.3** | 70.0 |
| cyrillic | 164.0 | 519.8 | 183.7† | 781.9‡ | 223.7‡ | 150.8† | 93.1† | 72.1‡ | 160.7‡ | 98.5‡ | **🏆 2,108.2‡** | 1,493.2‡ | 38.0‡ |
| chinese | 202.9‡ | 430.6 | 393.5† | 1,753.7‡ | 555.2‡ | 637.3† | 39.0‡ | 157.4‡ | 381.6‡ | 265.2‡ | **🏆 2,238.5‡**≈ | 1,535.8‡ | 3.9‡ |
| japanese | 244.2† | 466.6† | 433.4† | 2,085.2† | 621.6† | 675.3† | 100.0† | 185.3† | 442.5† | 305.5† | 3,805.9† | 2,301.2† | 9.6† |
| korean | 279.4 | 823.1 | 379.2† | 1,572.1‡ | 418.0 | 275.6† | 133.6† | 135.6 | 294.5 | 219.6‡ | **🏆 3,219.2** | 1,756.6‡ | 30.1‡ |
| mixed | 182.5† | 278.1† | 240.9† | 1,021.1† | 376.6† | 267.1† | 77.6† | 99.5† | 206.0† | 176.1† | 2,635.0† | 2,141.1† | 15.6† |
| long | 4.2† | 5.2† | 4.5† | 13.9† | 7.0† | 9.5† | 1.4† | 1.7† | 4.0† | 3.2† | 54.0† | 78.4† | 0.3† |

### Slugify

| Test | Before Full 2.6.2 | After Full next (unreleased) | After Latin next (unreleased) | slugify JS 1.6.9 | slug 12.0.1 | speakingurl 14.0.1 | Sindre slugify 3.0.1 | limax 4.2.3 | python-slugify 9.1.3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ascii | 78.8 | 630.7 | **🏆 716.2**≈ | 119.5 | 38.3 | 38.4 | 115.4 | 30.7 | 80.9 |
| latin | 77.8 | 554.1 | **🏆 615.5**≈ | 157.0 | 55.5 | 57.7‡ | 110.7‡ | 42.6‡ | 48.3 |
| cyrillic | 74.3 | **🏆 352.0** | 158.9† | 147.7‡ | 49.9‡ | 50.5‡ | 72.5‡ | 34.4‡ | 33.9‡ |
| chinese | 68.0‡ | **🏆 269.5** | 313.4† | 286.6† | 28.8† | 92.2† | 135.7† | 8.0‡ | 40.4‡ |
| japanese | 97.5† | 341.6† | 433.3† | 362.8† | 37.5† | 130.0† | 141.5† | 80.1† | 54.3† |
| korean | 79.7 | **🏆 516.5** | 290.9† | 234.9† | 19.5† | 77.0† | 102.7† | 53.5† | 33.0 |
| mixed | 85.4† | 249.0† | 209.7† | 146.8† | 26.4† | 45.2† | 91.0† | 20.2† | 31.8† |
| long | 2.8† | 4.9† | 3.2† | 2.9† | 0.6† | 1.0† | 7.0† | 0.6† | 1.1† |

Measured 2026-10-23T12:57:47.129Z, v26.5.0, Intel(R) Xeon(R) CPU E5-2698 v4 @ 2.20GHz. [Method and commands](benchmark/README.md) · [Retained results and ranges](benchmark/RESULTS.md).

<!-- benchmark-results:end -->

## License

MIT
