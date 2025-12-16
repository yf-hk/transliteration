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
// Full build: ~186 KB (all scripts including CJK, Korean, etc.)
import { transliterate, slugify } from 'transliteration';

// Latin-only build: ~5 KB (Basic Latin + Latin Extended only)
import { transliterate, slugify } from 'transliteration/latin';
```

The Latin-only build supports:

- Basic ASCII (U+0000-U+007F)
- Latin-1 Supplement (U+0080-U+00FF)
- Latin Extended-A (U+0100-U+017F)
- Latin Extended-B (U+0180-U+024F)

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
  transliterate('你好, World');  // => 'Ni Hao , World'
  slugify('Hello, 世界');       // => 'hello-shi-jie'
  
  // Legacy method (will be removed in next major version)
  transl('Hola, mundo');       // => 'hola-mundo'
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

## Usage

### transliterate(str, [options])

Converts Unicode characters in the input string to their Latin equivalents. Unrecognized characters are replaced with the `unknown` placeholder or removed if no placeholder is specified.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ignore` | `string[]` | `[]` | Strings to preserve without transliteration |
| `replace` | `object` or `array` | `{}` | Custom replacements applied before transliteration |
| `replaceAfter` | `object` or `array` | `{}` | Custom replacements applied after transliteration |
| `trim` | `boolean` | `false` | Trim leading and trailing whitespace from result |
| `unknown` | `string` | `''` | Replacement character for unrecognized Unicode |
| `fixChineseSpacing` | `boolean` | `true` | Insert spaces between transliterated Chinese characters |

#### Example

```javascript
import { transliterate as tr } from 'transliteration';

// Basic usage
tr('你好，世界');                  // => 'Ni Hao , Shi Jie'
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
| `fixChineseSpacing` | `boolean` | `true` | Insert spaces between transliterated Chinese characters |

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

## License

MIT
