import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
import {adapters,dir,entry,repo} from './adapters.mjs';
const require=createRequire(path.join(dir,'deps/package.json'));
const {build}=require('esbuild');
const output=path.join(dir,'bundles');fs.mkdirSync(output,{recursive:true});
const rows=[];
for(const a of adapters) {
  const sourceEntry=a.id==='current-full' ? path.join(repo,'dist/browser/bundle.esm.min.js') : a.id==='current-latin' ? path.join(repo,'dist/browser/latin.esm.min.js') : entry(a);
  let contents;
  if(a.id.endsWith('-full') || a.id==='current-latin') contents=`export {transliterate,slugify} from ${JSON.stringify(sourceEntry)};`;
  else if(a.id==='simov-slugify') contents=`import fn from ${JSON.stringify(sourceEntry)}; export const slugify=s=>fn(s,{lower:true,strict:true});`;
  else contents=`export {default as ${a.modes[0]}} from ${JSON.stringify(sourceEntry)};`;
  try {
    const result=await build({stdin:{contents,resolveDir:dir},bundle:true,minify:true,platform:'browser',format:'esm',target:'es2020',write:false,logLevel:'silent'});
    const code=result.outputFiles[0].contents;
    fs.writeFileSync(path.join(output,`${a.id}.mjs`),code);
    rows.push({id:a.id,bytes:code.length,gzip:zlib.gzipSync(code,{level:9}).length,brotli:zlib.brotliCompressSync(code,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:11}}).length});
  } catch(error) { rows.push({id:a.id,error:error.message}); }
}
const lock=JSON.parse(fs.readFileSync(path.join(dir,'deps/package-lock.json'),'utf8'));
fs.writeFileSync(path.join(dir,'package-versions.json'),JSON.stringify({esbuild:require('esbuild/package.json').version,packages:Object.fromEntries(Object.entries(lock.packages).filter(([k])=>k).map(([k,v])=>[k,{version:v.version,integrity:v.integrity,license:v.license}]))},null,2)+'\n');
fs.writeFileSync(path.join(dir,'bundle-sizes.json'),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
