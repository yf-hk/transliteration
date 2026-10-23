import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {dir,repo,adapters} from './adapters.mjs';
const require=createRequire(path.join(dir,'deps/package.json'));
const {build}=require('esbuild');
const measure=bytes=>({bytes:bytes.length,gzip9:zlib.gzipSync(bytes,{level:9}).length,brotli11:zlib.brotliCompressSync(bytes,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:11}}).length});
const prototypes=JSON.parse(fs.readFileSync(path.join(dir,'prototype-adapters.json'),'utf8'));
const packagingOnly=process.argv.includes('--packaging-only');
const onlyPrototype=process.argv.find(arg=>arg.startsWith('--prototype='))?.slice(12);
const prototypeSizes=packagingOnly||onlyPrototype?JSON.parse(fs.readFileSync(path.join(dir,'prototype-sizes.json'),'utf8')).results.filter(row=>row.id!==onlyPrototype):[];
for(const adapter of packagingOnly?[]:prototypes.filter(row=>!onlyPrototype||row.id===onlyPrototype)){
  const code=fs.readFileSync(adapter.module);
  const esm=await build({stdin:{contents:`export {transliterate,slugify} from ${JSON.stringify(adapter.module)};`,resolveDir:dir},bundle:true,minify:true,platform:'browser',format:'esm',target:'es2020',write:false,logLevel:'silent'});
  prototypeSizes.push({id:adapter.id,cjs:measure(code),browserEsm:measure(esm.outputFiles[0].contents)});
}
fs.writeFileSync(path.join(dir,'prototype-sizes.json'),JSON.stringify({esbuild:require('esbuild/package.json').version,scope:'Full experimental API bundles; includes research mapper metadata and materialization compatibility.',results:prototypeSizes},null,2)+'\n');
if(onlyPrototype){console.log('Selected prototype size measured');process.exit(0);}
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(item=>item.isDirectory()&&item.name!=='node_modules'?files(path.join(directory,item.name)):item.isFile()?[path.join(directory,item.name)]:[]);}
const installed=[];
for(const adapter of adapters.filter(a=>a.package)){
  const folder=path.join(dir,'deps/node_modules',adapter.package);
  const json=JSON.parse(fs.readFileSync(path.join(folder,'package.json'),'utf8'));
  const seen=new Set();
  function dependencies(name){if(seen.has(name))return 0;seen.add(name);const place=path.join(dir,'deps/node_modules',name);const metadata=JSON.parse(fs.readFileSync(path.join(place,'package.json'),'utf8'));return files(place).reduce((sum,file)=>sum+fs.statSync(file).size,0)+Object.keys(metadata.dependencies??{}).reduce((sum,dep)=>sum+dependencies(dep),0);}
  const registryUrl=`https://registry.npmjs.org/${encodeURIComponent(adapter.package)}/${json.version}`;
  const response=await fetch(registryUrl);if(!response.ok)throw new Error(`Registry ${response.status}`);const metadata=await response.json();
  const archive=await fetch(metadata.dist.tarball);if(!archive.ok)throw new Error(`Tarball ${archive.status}`);const tarballGzipBytes=(await archive.arrayBuffer()).byteLength;
  installed.push({id:adapter.id,package:adapter.package,version:json.version,license:json.license??null,ownInstalledBytes:files(folder).reduce((sum,file)=>sum+fs.statSync(file).size,0),runtimeTreeInstalledBytes:dependencies(adapter.package),runtimePackages:[...seen],registryUrl,tarball:metadata.dist.tarball,tarballGzipBytes,registryUnpackedBytes:metadata.dist.unpackedSize,fileCount:metadata.dist.fileCount,integrity:metadata.dist.integrity});
}
const packageDir=path.join(dir,'package-experiments');fs.mkdirSync(packageDir,{recursive:true});
const runPack=cwd=>{const output=path.join(packageDir,path.basename(cwd)==='repo'?'current':'lean');fs.mkdirSync(output,{recursive:true});const child=spawnSync('npm',['pack','--ignore-scripts','--json','--pack-destination',output],{cwd,encoding:'utf8',timeout:120000});if(child.status!==0)throw new Error(child.stderr);return JSON.parse(child.stdout)[0];};
const current=runPack(repo);
const stage=path.join(packageDir,'lean-stage');fs.mkdirSync(stage,{recursive:true});
for(const item of current.files)if(!item.path.startsWith('dist/')){const destination=path.join(stage,item.path);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(repo,item.path),destination);}
fs.cpSync(path.join(repo,'dist'),path.join(stage,'dist'),{recursive:true});
let removedSourceContentBytes=0;
for(const file of files(path.join(stage,'dist')).filter(file=>file.endsWith('.map'))){const original=fs.readFileSync(file);const map=JSON.parse(original);delete map.sourcesContent;const updated=JSON.stringify(map);removedSourceContentBytes+=original.length-Buffer.byteLength(updated);fs.writeFileSync(file,updated);}
for(const cli of ['transliterate','slugify']){
  await build({entryPoints:[path.join(repo,`src/cli/${cli}.ts`)],outfile:path.join(stage,`dist/bin/${cli}`),bundle:true,minify:true,platform:'node',format:'cjs',target:'es2020',logLevel:'silent',plugins:[{name:'shared-node-api',setup(b){b.onResolve({filter:/^\.\.\/node(?:\/index)?$/},()=>({path:'../node/src/node/index.js',external:true}));}}]});
  fs.chmodSync(path.join(stage,`dist/bin/${cli}`),0o755);
  assert.ok(fs.statSync(path.join(stage,`dist/bin/${cli}`)).size<20000,'CLI still embeds the full data');
}
let cliChecks=0;
for(const cli of ['transliterate','slugify'])for(const args of [['你好世界'],['Crème 北京 안녕하세요'],['hello世界'],['--help']]){
  const options={encoding:'utf8',timeout:30000};
  const original=spawnSync(process.execPath,[path.join(repo,`dist/bin/${cli}`),...args],options);
  const experimental=spawnSync(process.execPath,[path.join(stage,`dist/bin/${cli}`),...args],options);
  assert.equal(experimental.status,original.status);assert.equal(experimental.stdout,original.stdout);cliChecks++;
}
const lean=runPack(stage);
const distFiles=files(path.join(repo,'dist')).map(file=>({file:path.relative(repo,file),bytes:fs.statSync(file).size}));
const report={owner:'GPT-6 Astra, max effort',measuredAt:new Date().toISOString(),installed,currentPackage:{size:current.size,unpackedSize:current.unpackedSize,files:current.files,filename:current.filename},leanPackagingExperiment:{size:lean.size,unpackedSize:lean.unpackedSize,removedSourceContentBytes,cliChecks,scope:'Current production algorithm/data; two CLI bundles share the existing Node API, and source-map embedded source content is removed. Staged artifact only; production unchanged.'},distFiles};
fs.writeFileSync(path.join(dir,'package-sizes.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({prototypeCount:prototypeSizes.length,currentPackageBytes:current.size,leanPackageBytes:lean.size,cliChecks}));
