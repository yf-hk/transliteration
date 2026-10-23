import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
export const repository = path.dirname(directory);
export const nativeDirectory = path.join(directory, 'native');
export const nativeBuildDirectory = path.join(directory, '.build', 'native');
