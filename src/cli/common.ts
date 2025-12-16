import type { OptionReplaceArray, OptionReplaceArrayItem } from '../types';

const DOUBLE_ESCAPE_REGEX = /[^\\]\\\\=/;
const DOUBLE_ESCAPE_REPLACE_REGEX = /([^\\])\\\\=/g;
const SINGLE_ESCAPE_REGEX = /[^\\]\\=/;
const SINGLE_ESCAPE_REPLACE_REGEX = /([^\\])\\=/g;
const SUBSTITUTE_REGEX = /__REPLACE_SUBSTITUTE__/g;

export type ParsedArgs = {
  _: string[];
  [key: string]: string | string[] | boolean | undefined;
};

function addToResult(result: ParsedArgs, key: string, value: string): void {
  const existing = result[key];
  if (existing !== undefined) {
    if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing as string, value];
    }
  } else {
    result[key] = value;
  }
}

function parseOption(
  result: ParsedArgs,
  args: string[],
  i: number,
  key: string
): number {
  const nextArg = args[i + 1];
  if (!nextArg || nextArg.startsWith('-')) {
    result[key] = true;
    return i;
  }
  addToResult(result, key, nextArg);
  return i + 1;
}

/**
 * Simple argument parser - no dependencies
 */
export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = { _: [] };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      i = parseOption(result, args, i, arg.slice(2));
    } else if (arg.startsWith('-') && arg.length === 2) {
      i = parseOption(result, args, i, arg.slice(1));
    } else {
      result._.push(arg);
    }
    i += 1;
  }

  return result;
}

/**
 * Parse string option into an array pair
 * @param option the individual `replace` option provided by the CLI command
 * @example 'x=y'
 */
export function parseReplaceOptionItem(option: string): OptionReplaceArrayItem {
  const substitute = '__REPLACE_SUBSTITUTE__';
  let str = option;

  // escape for \\=
  if (DOUBLE_ESCAPE_REGEX.test(str)) {
    str = str.replace(DOUBLE_ESCAPE_REPLACE_REGEX, '$1\\=');
  } else if (SINGLE_ESCAPE_REGEX.test(str)) {
    str = str.replace(SINGLE_ESCAPE_REPLACE_REGEX, `$1${substitute}`);
  }

  let result = str
    .split('=')
    .map((value) => value.replace(SUBSTITUTE_REGEX, '='));

  if (result.length !== 2) {
    result = [result.splice(0, 1)[0], result.join('=')];
  }

  return result as OptionReplaceArrayItem;
}

/**
 * Parse the `replace` option array into the actual usable option
 */
export function parseReplaceOption(
  argvReplaceOption: string[]
): OptionReplaceArray {
  return argvReplaceOption.map((item) => parseReplaceOptionItem(item));
}

/**
 * Ensure value is an array
 */
export function toArray(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export const HELP_TRANSLITERATE = `
Usage: transliterate <text> [options]

Options:
  -u, --unknown    Placeholder for unknown characters (default: "")
  -r, --replace    Custom string replacement (format: "from=to")
  -i, --ignore     String list to ignore
  -S, --stdin      Use stdin as input
  -h, --help       Show help
  -v, --version    Show version

Examples:
  transliterate "你好, world!" -r "好=good"
  transliterate "你好，世界!" -i "你好" -i "，"
  echo "你好" | transliterate -S
`;

export const HELP_SLUGIFY = `
Usage: slugify <text> [options]

Options:
  -U, --unknown    Placeholder for unknown characters (default: "")
  -l, --lowercase  Returns result in lowercase (default: true)
  -u, --uppercase  Returns result in uppercase
  -s, --separator  Separator of the slug (default: "-")
  -r, --replace    Custom string replacement (format: "from=to")
  -i, --ignore     String list to ignore
  -S, --stdin      Use stdin as input
  -h, --help       Show help
  -v, --version    Show version

Examples:
  slugify "你好, world!" -r "好=good"
  slugify "你好，世界!" -s "_"
  echo "你好" | slugify -S
`;
