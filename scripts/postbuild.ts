import { renameSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const distBin = join(process.cwd(), 'dist', 'bin');

const files = ['transliterate', 'slugify'];

for (const file of files) {
  const src = join(distBin, `${file}.js`);
  const dest = join(distBin, file);
  
  if (existsSync(src)) {
    if (existsSync(dest)) {
      unlinkSync(dest);
    }
    renameSync(src, dest);
    console.log(`Renamed ${file}.js -> ${file}`);
  } else {
    console.log(`Source not found: ${src}`);
  }
}
