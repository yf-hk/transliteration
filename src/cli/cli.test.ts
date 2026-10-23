import { describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TRAILING_NEWLINE_REGEX = /[\r\n]+$/;

type CliCommand = 'transliterate' | 'slugify';

const projectRoot = join(import.meta.dirname, '../../');

const runCli = async (
  command: CliCommand,
  args: string[],
  options: { stdin?: number; env?: NodeJS.ProcessEnv } = {}
): Promise<{ stdout: string; stderr: string }> => {
  // Bun consumes the first -- after the script path.
  const result = spawnSync(
    process.execPath,
    [`src/cli/${command}.ts`, '--', ...args],
    {
      cwd: projectRoot,
      env: options.env ?? process.env,
      shell: false,
      stdio: [options.stdin ?? 'ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 5000,
    }
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} failed (${result.error?.message ?? result.signal ?? result.status})\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
      { cause: result.error }
    );
  }
  return { stdout: result.stdout, stderr: result.stderr };
};

const runCliFromFile = async (command: CliCommand): Promise<string> => {
  const directory = mkdtempSync(join(tmpdir(), 'transliteration-cli-'));
  const marker = join(directory, 'executed');
  const filename = join(
    directory,
    'input $(touch "$TRANSLITERATION_CLI_PATH_MARKER") `printf expanded` "quotes" ;&$.txt'
  );
  try {
    writeFileSync(filename, '你好，世界！');
    const stdin = openSync(filename, 'r');
    try {
      const { stdout } = await runCli(command, ['-S'], {
        stdin,
        env: { ...process.env, TRANSLITERATION_CLI_PATH_MARKER: marker },
      });
      expect(existsSync(marker)).toBe(false);
      return stdout;
    } finally {
      closeSync(stdin);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe('CLI transliterate', () => {
  const tr = async (
    str: string,
    options: { ignore?: string[]; replace?: [string, string][] } = {}
  ): Promise<string> => {
    const args: string[] = [];
    for (const ignore of options.ignore ?? []) {
      args.push('-i', ignore);
    }
    for (const [from, to] of options.replace ?? []) {
      args.push('-r', `${from}=${to}`);
    }
    const [trailingSpaces] = str.match(TRAILING_NEWLINE_REGEX) || [''];
    const { stdout } = await runCli('transliterate', [...args, '--', str]);
    return stdout.replace(TRAILING_NEWLINE_REGEX, '') + trailingSpaces;
  };

  describe('Basic string tests', () => {
    it('should handle basic strings', async () => {
      const tests: (string | number)[] = [
        '',
        1 / 10,
        'I like pie.',
        '\n',
        '\r\n',
        'I like pie.\n',
        '-h',
        '--stdin',
      ];

      for (const str of tests) {
        expect(await tr(str.toString())).toBe(str.toString());
      }
    });
  });

  describe('Complex tests', () => {
    const tests: [string, string][] = [
      ['Æneid', 'AEneid'],
      ['étude', 'etude'],
      ['北亰', 'Bei Jing'],
      ['ᔕᓇᓇ', 'shanana'],
      ['ᏔᎵᏆ', 'taliqua'],
      ['ܦܛܽܐܺ', "ptu'i"],
      ['अभिजीत', 'abhijiit'],
      ['অভিজীত', 'abhijiit'],
      ['അഭിജീത', 'abhijiit'],
      ['മലയാലമ്', 'mlyaalm'],
      ['げんまい茶', 'genmaiCha'],
    ];

    it.each(tests)('should transliterate %s', async (str, result) => {
      expect(await tr(str)).toBe(result);
    });
  });

  describe('With ignore option', () => {
    it('should ignore specified characters', async () => {
      const tests: [string, string[], string][] = [
        ['Æneid', ['Æ'], 'Æneid'],
        ['你好，世界！', ['，', '！'], 'Ni Hao，Shi Jie！'],
        ['你好，世界！', ['你好', '！'], '你好,Shi Jie！'],
      ];
      for (const [str, ignore, result] of tests) {
        expect(await tr(str, { ignore })).toBe(result);
      }
    });
  });

  describe('With replace option', () => {
    it('should replace specified strings', async () => {
      const tests: [string, [string, string][], string][] = [
        ['你好，世界！', [['你好', 'Hola']], 'Hola,Shi Jie!'],
      ];
      for (const [str, replace, result] of tests) {
        expect(await tr(str, { replace })).toBe(result);
      }
    });
  });

  it('should pass shell metacharacters in input and options literally', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'transliteration-argv-'));
    const marker = join(directory, 'executed');
    const payload = `$(touch '${marker}') \`printf backtick\` $HOME "quotes" \\ ;&|<>*?[]`;
    try {
      expect(await tr(payload)).toBe(payload);
      expect(await tr('你好', { replace: [['你好', payload]] })).toBe(payload);
      expect(await tr('你好', { ignore: [`$(touch '${marker}')`] })).toBe(
        'Ni Hao'
      );
      const ignored = `你好${payload}`;
      expect(await tr(ignored, { ignore: [ignored] })).toBe(ignored);
      expect(existsSync(marker)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('should retain CLI failure diagnostics', async () => {
    await expect(runCli('transliterate', [])).rejects.toThrow(
      "stderr: Invalid argument. Please type 'transliterate --help' for help."
    );
  });

  describe('Stream input', () => {
    it('should handle stream input', async () => {
      expect(await runCliFromFile('transliterate')).toBe('Ni Hao,Shi Jie!\n');
    });
  });
});

describe('CLI slugify', () => {
  const slugify = async (
    str: string,
    options: {
      ignore?: string[];
      replace?: [string, string][];
      lowercase?: boolean;
      uppercase?: boolean;
      separator?: string;
    } = {}
  ): Promise<string> => {
    const args: string[] = [];
    for (const ignore of options.ignore ?? []) {
      args.push('-i', ignore);
    }
    for (const [from, to] of options.replace ?? []) {
      args.push('-r', `${from}=${to}`);
    }
    if (options.lowercase) {
      args.push('-l');
    }
    if (options.uppercase) {
      args.push('-u');
    }
    if (options.separator !== undefined) {
      args.push('-s', options.separator);
    }
    const [trailingSpaces] = str.match(TRAILING_NEWLINE_REGEX) || [''];
    const { stdout } = await runCli('slugify', [...args, '--', str]);
    return stdout + trailingSpaces;
  };

  describe('Generate slugs', () => {
    it('should generate slugs correctly', async () => {
      const tests: [string, Parameters<typeof slugify>[1], string][] = [
        ['你好, 世界!', {}, 'ni-hao-shi-jie\n'],
        ['你好, 世界!', { separator: '_' }, 'ni_hao_shi_jie\n'],
        ['你好, 世界!', { separator: '' }, 'nihaoshijie\n'],
        ['-h', {}, 'h\n'],
        ['你好, 世界!', { uppercase: true }, 'NI-HAO-SHI-JIE\n'],
        ['你好, 世界!', { ignore: ['!', ','] }, 'ni-hao,-shi-jie!\n'],
        ['你好, 世界!', { replace: [['世界', '未来']] }, 'ni-hao-wei-lai\n'],
        [
          '你好, 世界!',
          {
            replace: [
              ['你好', 'Hello'],
              ['世界', 'World'],
            ],
          },
          'hello-world\n',
        ],
      ];

      for (const [str, options, slug] of tests) {
        expect(await slugify(str, options)).toBe(slug);
      }
    });
  });

  it('should pass shell metacharacters in input and options literally', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'slugify-argv-'));
    const marker = join(directory, 'executed');
    const separator = `$(touch '${marker}') \`printf tick\` $HOME "quotes" \\;&|<>`;
    try {
      expect(await slugify('你好 $HOME $(printf HELLO) `printf WORLD`')).toBe(
        'ni-hao-home-printf-hello-printf-world\n'
      );
      expect(
        await slugify('你好', { replace: [['你好', '$(printf LITERAL)']] })
      ).toBe('printf-literal\n');
      expect(await slugify('你好$HOME', { ignore: ['你好$HOME'] })).toBe(
        '你好$home\n'
      );
      expect(await slugify('你好', { ignore: [`$(touch '${marker}')`] })).toBe(
        'ni-hao\n'
      );
      expect(await slugify('hello world', { separator })).toBe(
        `hello${separator.toLowerCase()}world\n`
      );
      expect(existsSync(marker)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  describe('Stream input', () => {
    it('should handle stream input', async () => {
      expect(await runCliFromFile('slugify')).toBe('ni-hao-shi-jie\n');
    });
  });
});
