import { rmSync } from 'node:fs';
import { build } from 'tsdown';

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
await import('./generate-data');
await build({ config: true });
