import { readFileSync,writeFileSync,cpSync,mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { gzipSync,brotliCompressSync,constants } from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=path.dirname(fileURLToPath(import.meta.url));
const repository=path.resolve(directory,'../..');
const files=['node/src/node/index.js','node/src/node/latin.js','browser/bundle.esm.min.js','browser/bundle.umd.min.js','browser/latin.esm.min.js','browser/latin.umd.min.js'];
const result={runtime:process.version,files:[],packages:[],memory:[]};
for(const [name,dist] of [['before',path.join(directory,'before-dist')],['after',path.join(repository,'dist')]]){
 for(const file of files){const source=readFileSync(path.join(dist,file));result.files.push({name,file,rawBytes:source.length,gzipBytes:gzipSync(source,{level:9}).length,brotliBytes:brotliCompressSync(source,{params:{[constants.BROTLI_PARAM_QUALITY]:5}}).length});}
 const packageDirectory=path.join(directory,`package-${name}`);mkdirSync(packageDirectory,{recursive:true});
 cpSync(dist,path.join(packageDirectory,'dist'),{recursive:true});
 for(const file of ['package.json','README.md','LICENSE.txt'])cpSync(path.join(repository,file),path.join(packageDirectory,file));
 const packed=spawnSync('npm',['pack','--ignore-scripts','--json','--pack-destination',directory],{cwd:packageDirectory,encoding:'utf8'});
 if(packed.status!==0)throw new Error(packed.stderr);
 const metadata=JSON.parse(packed.stdout)[0];
 cpSync(path.join(directory,metadata.filename),path.join(directory,`${name}.tgz`));
 result.packages.push({name,...metadata});
}
for(let round=0;round<5;round++){
 for(const name of round%2?['after','before']:['before','after']){
  const file=path.join(name==='before'?path.join(directory,'before-dist'):path.join(repository,'dist'),'node/src/node/index.js');
  const measured=spawnSync(process.execPath,['--expose-gc',path.join(directory,'memory-worker.mjs'),file],{encoding:'utf8'});
  if(measured.status!==0)throw new Error(measured.stderr);
  result.memory.push({name,round,...JSON.parse(measured.stdout)});
 }
}
writeFileSync(path.join(directory,'footprint-final.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({packages:result.packages.map(({name,size,unpackedSize})=>({name,size,unpackedSize})),files:result.files},null,2));
