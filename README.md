<p align="center"><img src="https://yf-hk.github.io/transliteration/transliteration.png" alt="Transliteration"></p>

[![Build Status](https://github.com/yf-hk/transliteration/actions/workflows/build.yml/badge.svg)](https://github.com/yf-hk/transliteration/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/github/yf-hk/transliteration/badge.svg?branch=main)](https://coveralls.io/github/yf-hk/transliteration?branch=main)
[![NPM Version](https://img.shields.io/npm/v/transliteration.svg)](https://www.npmjs.com/package/transliteration)
[![NPM Download](https://img.shields.io/npm/dm/transliteration.svg)](https://www.npmjs.com/package/transliteration)
[![JSDelivr Download](https://data.jsdelivr.com/v1/package/npm/transliteration/badge)](https://www.jsdelivr.com/package/npm/transliteration)
[![License](https://img.shields.io/npm/l/transliteration.svg)](https://github.com/yf-hk/transliteration/blob/main/LICENSE.txt)

# Transliteration

Universal Unicode to Latin transliteration + slugify module. Works on all platforms and with all major languages.

**[Try it out online →](https://yf-hk.github.io/transliteration)**

## Table of Contents

- [Transliteration](#transliteration)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Compatibility](#compatibility)
  - [Installation](#installation)
    - [Node.js / React Native](#nodejs--react-native)
    - [Browser (CDN)](#browser-cdn)
      - [UMD Build (Global Variables)](#umd-build-global-variables)
      - [ES Module](#es-module)
    - [CLI](#cli)
  - [Usage](#usage)
    - [transliterate(str, \[options\])](#transliteratestr-options)
      - [Options](#options)
      - [Example](#example)
    - [transliterate.config(\[optionsObj\], \[reset = false\])](#transliterateconfigoptionsobj-reset--false)
    - [slugify(str, \[options\])](#slugifystr-options)
      - [Options](#options-1)
      - [Example](#example-1)
    - [slugify.config(\[optionsObj\], \[reset = false\])](#slugifyconfigoptionsobj-reset--false)
    - [CLI Usage](#cli-usage)
      - [Transliterate Command](#transliterate-command)
      - [Slugify Command](#slugify-command)
  - [Known Issues](#known-issues)
  - [License](#license)

## Features

- Convert Unicode characters to their Latin equivalents
- Create URL-friendly slugs from any Unicode string
- Customizable transliteration options
- Works in Node.js, browsers, and command-line
- TypeScript support
- Lightweight and dependency-free

## Compatibility

- Browsers: IE 9+ and all modern browsers
- Server: Node.js (all versions)
- Mobile: React Native
- Environments: Web Workers, CLI

## Installation

### Node.js / React Native

```bash
npm install transliteration --save
```

> **Note for TypeScript users:** Type definition files are built into this project since version `2.x`. Do not install `@types/transliteration`.

Basic usage example:

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
<script src="https://cdn.jsdelivr.net/npm/transliteration@2.1.8/dist/browser/bundle.umd.min.js"></script>
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
  import { transliterate } from 'https://cdn.jsdelivr.net/npm/transliteration@2.1.8/dist/browser/bundle.esm.min.js';
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

Transliterates the string `str` and returns the result. Characters that this module cannot handle will default to the placeholder character(s) specified in the `unknown` option. If no placeholder is provided, these characters will be removed.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ignore` | `string[]` | `[]` | List of strings to ignore (keep unchanged) |
| `replace` | `object` or `array` | `{}` | Custom replacements before transliteration |
| `replaceAfter` | `object` or `array` | `{}` | Custom replacements after transliteration |
| `trim` | `boolean` | `false` | Whether to trim the result string |
| `unknown` | `string` | `''` | Placeholder for unknown characters |
| `fixChineseSpacing` | `boolean` | `true` | Add spaces between transliterated Chinese characters |

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

Binds option object globally so all subsequent calls will use `optionsObj` by default. If `optionsObj` is not provided, it will return the current default option object.

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

Converts Unicode `str` into a slug string, ensuring it is safe to use in a URL or filename.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ignore` | `string[]` | `[]` | List of strings to ignore (keep unchanged) |
| `replace` | `object` or `array` | `{}` | Custom replacements before transliteration |
| `replaceAfter` | `object` or `array` | `{}` | Custom replacements after transliteration |
| `trim` | `boolean` | `false` | Whether to trim the result string |
| `unknown` | `string` | `''` | Placeholder for unknown characters |
| `lowercase` | `boolean` | `true` | Convert result to lowercase |
| `uppercase` | `boolean` | `false` | Convert result to uppercase |
| `separator` | `string` | `-` | Character used between words |
| `allowedChars` | `string` | `a-zA-Z0-9-_.~'` | Regex pattern of allowed characters |
| `fixChineseSpacing` | `boolean` | `true` | Add spaces between transliterated Chinese characters |

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

Binds option object globally so all subsequent calls will use `optionsObj` by default. If `optionsObj` is not provided, it will return the current default option object.

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

Currently, `transliteration` only supports 1-to-1 code mapping (from Unicode to Latin). This is the simplest implementation approach, but it has limitations with polyphonic characters. Please test thoroughly with your specific languages before using in production.

Known language-specific issues:

| Language | Issue | Alternative |
|----------|-------|-------------|
| **Chinese** | Polyphonic characters may not transliterate correctly | [`pinyin`](https://www.npmjs.com/package/pinyin) |
| **Japanese** | Kanji characters often convert to Chinese Pinyin due to Unicode overlap | [`kuroshiro`](https://www.npmjs.com/package/kuroshiro) |
| **Thai** | Not working properly | [Issue #67](https://github.com/yf-hk/transliteration/issues/67) |
| **Cyrillic** | May be inaccurate for specific languages like Bulgarian | - |

If you find any other issues, please [raise a ticket](https://github.com/yf-hk/transliteration/issues).

## License

MIT
