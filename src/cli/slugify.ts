#!/usr/bin/env node

import { slugify } from '../node';
import type { OptionsSlugify } from '../types';
import { HELP_SLUGIFY, parseArgs, parseReplaceOption, toArray } from './common';

const VERSION = '2.4.0';

const argv = parseArgs(process.argv.slice(2));

if (argv.h || argv.help) {
  console.log(HELP_SLUGIFY);
  process.exit(0);
}

if (argv.v || argv.version) {
  console.log(VERSION);
  process.exit(0);
}

const replaceArg = argv.r ?? argv.replace;
const ignoreArg = argv.i ?? argv.ignore;

const options: OptionsSlugify = {
  unknown: String(argv.U || argv.unknown || ''),
  lowercase:
    argv.l !== undefined || argv.lowercase !== undefined
      ? !!(argv.l || argv.lowercase)
      : true,
  uppercase: !!(argv.u || argv.uppercase),
  separator: String(argv.s ?? argv.separator ?? '-'),
  replace: parseReplaceOption(
    toArray(typeof replaceArg === 'boolean' ? undefined : replaceArg)
  ),
  ignore: toArray(typeof ignoreArg === 'boolean' ? undefined : ignoreArg),
};

if (argv.S || argv.stdin) {
  process.stdin.setEncoding('utf-8');
  process.stdin.on('readable', () => {
    const chunk = process.stdin.read() as string;
    if (chunk !== null) {
      process.stdout.write(slugify(chunk, options));
    }
  });
  process.stdin.on('end', () => console.log(''));
} else if (argv._.length !== 1) {
  console.error("Invalid argument. Please type 'slugify --help' for help.");
  process.exit(1);
} else {
  console.log(slugify(String(argv._[0] ?? ''), options));
}
