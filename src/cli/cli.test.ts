import { type ExecException, exec } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const TRAILING_NEWLINE_REGEX = /[\r\n]+$/;

const execAsync = async (
  command: string,
  cwd: string
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    exec(
      command,
      { cwd },
      (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });

const projectRoot = join(import.meta.dirname, '../../');

describe('CLI transliterate', () => {
  const execPath = 'bun src/cli/transliterate.ts';

  const escapeStr = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const tr = async (
    str: string,
    options: { ignore?: string[]; replace?: [string, string][] } = {}
  ): Promise<string> => {
    const escapedStr = escapeStr(str);
    let args = '';
    if (Array.isArray(options.ignore)) {
      args += options.ignore
        .map((s: string): string => ` -i "${escapeStr(s)}"`)
        .join('');
    }
    if (Array.isArray(options.replace)) {
      args += options.replace
        .map(
          (s: [string, string]): string =>
            ` -r "${escapeStr(s[0])}=${escapeStr(s[1])}"`
        )
        .join('');
    }
    const [trailingSpaces] = str.match(TRAILING_NEWLINE_REGEX) || [''];
    const { stdout } = await execAsync(
      `${execPath} "${escapedStr}"${args}`,
      projectRoot
    );
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
      ];

      for (const str of tests) {
        expect(await tr(str.toString())).toBe(str.toString());
      }
    });
  });

  describe('Complex tests', () => {
    it('should transliterate various scripts', async () => {
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

      for (const [str, result] of tests) {
        expect(await tr(str)).toBe(result);
      }
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

  describe('Stream input', () => {
    it('should handle stream input', async () => {
      const filename = join(
        tmpdir(),
        `${Math.floor(Math.random() * 10_000_000).toString(16)}.txt`
      );
      writeFileSync(filename, '你好，世界！');
      const { stdout } = await execAsync(
        `${execPath} -S < "${filename}"`,
        projectRoot
      );
      unlinkSync(filename);
      expect(stdout).toBe('Ni Hao,Shi Jie!\n');
    });
  });
});

describe('CLI slugify', () => {
  const execPath = 'bun src/cli/slugify.ts';

  const escapeStr = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

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
    const escapedStr = escapeStr(str);
    let args = '';
    if (Array.isArray(options.ignore)) {
      args += options.ignore
        .map((s: string): string => ` -i "${escapeStr(s)}"`)
        .join('');
    }
    if (Array.isArray(options.replace)) {
      args += options.replace
        .map(
          (s: [string, string]): string =>
            ` -r "${escapeStr(s[0])}=${escapeStr(s[1])}"`
        )
        .join('');
    }
    if (options.lowercase) {
      args += ' -l';
    }
    if (options.uppercase) {
      args += ' -u';
    }
    if (options.separator) {
      args += ` -s "${escapeStr(options.separator)}"`;
    }
    const [trailingSpaces] = str.match(TRAILING_NEWLINE_REGEX) || [''];
    const { stdout } = await execAsync(
      `${execPath} "${escapedStr}"${args}`,
      projectRoot
    );
    return stdout + trailingSpaces;
  };

  describe('Generate slugs', () => {
    it('should generate slugs correctly', async () => {
      const tests: [string, object, string][] = [
        ['你好, 世界!', {}, 'ni-hao-shi-jie\n'],
        ['你好, 世界!', { separator: '_' }, 'ni_hao_shi_jie\n'],
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
        expect(
          await slugify(str, options as Parameters<typeof slugify>[1])
        ).toBe(slug);
      }
    });
  });

  describe('Stream input', () => {
    it('should handle stream input', async () => {
      const filename = join(
        tmpdir(),
        `${Math.floor(Math.random() * 10_000_000).toString(16)}.txt`
      );
      writeFileSync(filename, '你好，世界！');
      const { stdout } = await execAsync(
        `${execPath} -S < "${filename}"`,
        projectRoot
      );
      unlinkSync(filename);
      expect(stdout).toBe('ni-hao-shi-jie\n');
    });
  });
});
