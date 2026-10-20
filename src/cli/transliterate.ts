#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { version } from '../../package.json';
import { transliterate as tr } from '../node/index';
import type { OptionsTransliterate } from '../types';
import {
  HELP_TRANSLITERATE,
  parseArgs,
  parseReplaceOption,
  toArray,
} from './common';

const argv = parseArgs(process.argv.slice(2), 'transliterate');

if (argv.help) {
  console.log(HELP_TRANSLITERATE);
  process.exit(0);
}

if (argv.version) {
  console.log(version);
  process.exit(0);
}

const replaceArg = argv.replace;
const ignoreArg = argv.ignore;

const options: OptionsTransliterate = {
  unknown: String(argv.unknown ?? ''),
  replace: parseReplaceOption(
    toArray(typeof replaceArg === 'boolean' ? undefined : replaceArg)
  ),
  ignore: toArray(typeof ignoreArg === 'boolean' ? undefined : ignoreArg),
};

if (argv.stdin) {
  console.log(tr(readFileSync(0, 'utf8'), options));
} else if (argv._.length !== 1) {
  console.error(
    "Invalid argument. Please type 'transliterate --help' for help."
  );
  process.exit(1);
} else {
  console.log(tr(String(argv._[0] ?? ''), options));
}
