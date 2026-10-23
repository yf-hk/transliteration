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
<script src="https://cdn.jsdelivr.net/npm/transliteration@2.7.0/dist/browser/bundle.umd.min.js"></script>
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
  import { transliterate } from 'https://cdn.jsdelivr.net/npm/transliteration@2.7.0/dist/browser/bundle.esm.min.js';
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

Before is the published **2.6.2** release. After Full and After Latin are **2.7.0**, loaded from this checkout's built exports. All libraries are JavaScript and were rotated together on the same Node.js version. Process startup and IPC are excluded from throughput.

The ASCII/Latin before/after fixtures have identical complete outputs (8/8 each). Observed gains:

| API / test | Before 2.6.2 k/s | After 2.7.0 k/s | Median gain |
| --- | ---: | ---: | ---: |
| transliterate / ascii | 286.0 (251.1–319.1) | 4,206.3 (3,929.8–5,244.4) | **14.71×** |
| transliterate / latin | 326.0 (310.5–379.2) | 1,212.7 (1,087.5–1,413.3) | **3.72×** |
| slugify / ascii | 85.3 (83.3–93.6) | 744.0 (710.7–945.8) | **8.72×** |
| slugify / latin | 103.2 (85.9–138.2) | 625.5 (548.9–718.4) | **6.06×** |

Thousands of complete strings/second; 5 rotated samples. **🏆** = highest eligible observed median; **≈** = overlapping ranges, so superiority is inconclusive. **†** = ineligible reading (dropped/retained/fallback text or failed reading probe). **‡** = limited reading probe passed, but complete outputs differ from After Full. A probe does not validate every pronunciation. No winner is awarded when every library fails a reading probe.

### Transliteration

| Test | Before Full 2.6.2 | After Full 2.7.0 | After Latin 2.7.0 | AnyAscii JS 0.3.3 | Unidecode JS 1.1.0 | Sindre transliterate 2.3.1 | pinyin-pro 3.29.5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ascii | 286.0 | **🏆 4,206.3**≈ | 4,174.6 | 971.6 | 2,432.6 | 514.2 | 95.2 |
| latin | 326.0 | **🏆 1,212.7**≈ | 1,001.1 | 1,178.7 | 964.3 | 384.5‡ | 114.9† |
| cyrillic | 175.1 | 537.2 | 159.2† | **🏆 784.7‡** | 252.3‡ | 138.6† | 75.8† |
| chinese | 211.0‡ | 451.5 | 386.5† | **🏆 1,728.4‡** | 542.8‡ | 658.9† | 48.7‡ |
| japanese | 272.5† | 423.0† | 368.9† | 2,003.2† | 660.3† | 643.1† | 90.8† |
| korean | 245.4 | 737.5 | 289.5† | **🏆 1,313.0‡** | 425.4 | 259.8† | 146.7† |
| mixed | 185.4† | 321.7† | 245.9† | 931.9† | 400.6† | 249.1† | 89.1† |
| long | 4.3† | 5.6† | 4.2† | 14.5† | 8.2† | 9.3† | 1.4† |

### Slugify

| Test | Before Full 2.6.2 | After Full 2.7.0 | After Latin 2.7.0 | slugify JS 1.6.9 | slug 12.0.1 | speakingurl 14.0.1 | Sindre slugify 3.0.1 | limax 4.2.3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ascii | 85.3 | **🏆 744.0**≈ | 708.7 | 111.7 | 42.9 | 40.5 | 111.0 | 30.2 |
| latin | 103.2 | **🏆 625.5**≈ | 581.2 | 185.1 | 63.0 | 55.0‡ | 97.6‡ | 38.6‡ |
| cyrillic | 76.1 | **🏆 368.7** | 155.5† | 128.6‡ | 49.2‡ | 45.3‡ | 59.1‡ | 32.8‡ |
| chinese | 71.3‡ | **🏆 279.8** | 356.3† | 296.0† | 31.4† | 90.7† | 122.6† | 6.6‡ |
| japanese | 82.2† | 350.2† | 396.5† | 341.3† | 37.7† | 118.5† | 129.5† | 53.0† |
| korean | 82.6 | **🏆 508.8** | 292.1† | 255.9† | 19.7† | 71.0† | 84.8† | 48.2† |
| mixed | 73.3† | 247.9† | 203.4† | 128.2† | 27.9† | 48.7† | 78.3† | 20.7† |
| long | 2.9† | 5.3† | 4.0† | 2.9† | 0.6† | 0.8† | 6.5† | 0.4† |

Measured 2026-10-23T13:29:38.862Z, v26.5.0, Intel(R) Xeon(R) CPU E5-2698 v4 @ 2.20GHz. [Method and commands](benchmark/README.md) · [Retained results and ranges](benchmark/RESULTS.md).

<!-- benchmark-results:end -->

## License

MIT
