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
  if (Array.isArray(existing)) {
    existing.push(value);
  } else if (typeof existing === 'string') {
    result[key] = [existing, value];
  } else {
    result[key] = value;
  }
}

function parseOption({
  result,
  args,
  i,
  key,
  booleans,
  inlineValue,
}: {
  result: ParsedArgs;
  args: string[];
  i: number;
  key: string;
  booleans: ReadonlySet<string>;
  inlineValue?: string;
}): number {
  const nextArg = args[i + 1];
  if (booleans.has(key)) {
    const explicit =
      inlineValue ??
      (nextArg === 'true' || nextArg === 'false' ? nextArg : undefined);
    if (explicit !== undefined && explicit !== 'true' && explicit !== 'false') {
      throw new Error(`Invalid boolean value for --${key}: ${explicit}`);
    }
    result[key] = explicit !== 'false';
    return inlineValue === undefined && explicit !== undefined ? i + 1 : i;
  }
  if (inlineValue !== undefined) {
    addToResult(result, key, inlineValue);
    return i;
  }
  if (nextArg === undefined) {
    result[key] = true;
    return i;
  }
  addToResult(result, key, nextArg);
  return i + 1;
}

function parseNamedOption(
  result: ParsedArgs,
  args: string[],
  i: number,
  config: { aliases: Record<string, string>; booleans: ReadonlySet<string> }
): number {
  const arg = args[i];
  const option = arg.slice(arg.startsWith('--') ? 2 : 1);
  const equals = option.indexOf('=');
  const name = equals === -1 ? option : option.slice(0, equals);
  const key = Object.hasOwn(config.aliases, name) ? config.aliases[name] : name;
  if (key.startsWith('no-') && config.booleans.has(key.slice(3))) {
    result[key.slice(3)] = false;
    return i;
  }
  return parseOption({
    result,
    args,
    i,
    key,
    booleans: config.booleans,
    inlineValue: equals === -1 ? undefined : option.slice(equals + 1),
  });
}

/**
 * Simple argument parser - no dependencies
 */
function parseArgumentList(
  args: string[],
  command: 'transliterate' | 'slugify'
): ParsedArgs {
  const result: ParsedArgs = { _: [] };
  const aliases: Record<string, string> = {
    h: 'help',
    v: 'version',
    S: 'stdin',
    r: 'replace',
    i: 'ignore',
    ...(command === 'slugify'
      ? { U: 'unknown', l: 'lowercase', u: 'uppercase', s: 'separator' }
      : { u: 'unknown' }),
  };
  const booleans = new Set(['help', 'version', 'stdin']);
  if (command === 'slugify') {
    booleans.add('lowercase');
    booleans.add('uppercase');
  }
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg === '--') {
      result._.push(...args.slice(i + 1));
      break;
    }
    if (arg.startsWith('--') || (arg.startsWith('-') && arg.length === 2)) {
      i = parseNamedOption(result, args, i, { aliases, booleans });
    } else {
      result._.push(arg);
    }
    i += 1;
  }

  return result;
}

export function parseArgs(
  args: string[],
  command: 'transliterate' | 'slugify'
): ParsedArgs {
  try {
    return parseArgumentList(args, command);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
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
