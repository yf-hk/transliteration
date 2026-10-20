#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { version } from '../../package.json';
import { slugify } from '../node';
import type { OptionsSlugify } from '../types';
import { HELP_SLUGIFY, parseArgs, parseReplaceOption, toArray } from './common';

const argv = parseArgs(process.argv.slice(2), 'slugify');

if (argv.help) {
  console.log(HELP_SLUGIFY);
  process.exit(0);
}

if (argv.version) {
  console.log(version);
  process.exit(0);
}

const replaceArg = argv.replace;
const ignoreArg = argv.ignore;

const options: OptionsSlugify = {
  unknown: String(argv.unknown ?? ''),
  lowercase: argv.lowercase === undefined ? true : argv.lowercase === true,
  uppercase: argv.uppercase === true,
  separator: String(argv.separator ?? '-'),
  replace: parseReplaceOption(
    toArray(typeof replaceArg === 'boolean' ? undefined : replaceArg)
  ),
  ignore: toArray(typeof ignoreArg === 'boolean' ? undefined : ignoreArg),
};

if (argv.stdin) {
  console.log(slugify(readFileSync(0, 'utf8'), options));
} else if (argv._.length !== 1) {
  console.error("Invalid argument. Please type 'slugify --help' for help.");
  process.exit(1);
} else {
  console.log(slugify(String(argv._[0] ?? ''), options));
}
