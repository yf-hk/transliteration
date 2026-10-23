import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
export const repository = path.dirname(directory);
