import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {dir,repo} from './adapters.mjs';
import {workloads,samples} from './workloads.mjs';
const require=createRequire(import.meta.url);
const currentPath=path.join(repo,'dist/node/src/node/index.js');
const selected=process.argv[2]?.split(',');
const variants=JSON.parse(fs.readFileSync(path.join(dir,'prototype-adapters.json'),'utf8')).filter(v=>!selected||selected.includes(v.id));
const report=[];
let assertions=0;
function eq(a,b){assert.deepEqual(a,b);assertions++;}
for(const variant of variants) {
  delete require.cache[require.resolve(currentPath)];
  const current=require(currentPath);
  const candidate=require(variant.module);
  const before=assertions;
  for(const mode of ['transliterate','slugify']) {
    const opts=[undefined,{unknown:'?'},{fixChineseSpacing:false},{ignore:['你好','SKU12','Ø']},{replace:[['hello','世界']]},{replaceAfter:[['Ni Hao','Hello']]},{trim:true},{allowedChars:undefined},{allowedChars:'',unknown:'?'},{separator:'--',uppercase:true},
      {replace:[[/a/g,'$&$$$1']]},{replace:[[/^|$/gu,'$&']]},{replace:[[/()/gu,'x']],unknown:'?'},
      {replaceAfter:[[/()/gu,'$&']]},{ignore:['你好'],replace:[[/()/gu,'x']]},
      {unknown:'word-with-punctuation!'},{unknown:' two words '},
    ];
    for(const input of [...Object.values(samples),...Object.values(workloads).flat(),'', 'a\bB','x\u0301中','a\x7fb','你好SKU12', 'twenty Øne', '\ud800x\udc00']) for(const option of opts) {
      eq(candidate[mode](input,option),current[mode](input,option));
    }
    for(let n=0;n<65536;n++) {
      const input=String.fromCharCode(n);
      eq(candidate[mode](input,{unknown:'?',fixChineseSpacing:false}),current[mode](input,{unknown:'?',fixChineseSpacing:false}));
    }
    const a=candidate[mode], b=current[mode];
    try {
      a.config({ignore:['SKU12'],unknown:'?',replace:[['hello','世界']]});
      b.config({ignore:['SKU12'],unknown:'?',replace:[['hello','世界']]});
      eq(a('helloSKU12🚀'),b('helloSKU12🚀'));
      a.config().replace.push(['world','你好']);b.config().replace.push(['world','你好']);
      eq(a('world'),b('world'));
    } finally { a.config(undefined,true);b.config(undefined,true); }
  }
  // Exercise customization/reset before the shared legacy default is exposed.
  // Use fresh module instances so the original sharing checks below stay fresh.
  for(const file of [variant.module,currentPath]){
    delete require.cache[require.resolve(file)];const fresh=require(file);
    const privateMap=fresh.transliterate.setData({x:'X','𠮷':'Ji'});
    eq(fresh.transliterate('axb'),'aXb');eq(fresh.transliterate('𠮷'),'Ji');eq(fresh.slugify('x'),'x');
    delete privateMap['ъ'];eq(fresh.transliterate('ъ',{unknown:'?'}),'?');
    const shared=fresh.slugify.setData();shared.y='Why';
    eq(fresh.transliterate('y'),'y');eq(fresh.slugify('y'),'why');
    fresh.transliterate.setData(undefined,true);eq(fresh.transliterate('y'),'Why');
    delete require.cache[require.resolve(file)];const resetFresh=require(file);
    const resetMap=resetFresh.transliterate.setData(undefined,true);resetMap.x='RESET';
    eq(resetFresh.transliterate('x'),'RESET');eq(resetFresh.slugify('x'),'x');
  }
  // The original instances still use an unexposed shared default.
  for(const api of [candidate,current]) {
    const exposed=api.transliterate.setData();
    const saved=exposed.x;
    exposed.x='Shared';
    eq(api.slugify('x'),'shared');
    exposed.x=saved;
    api.transliterate.setData({x:'', '𠮷':'Ji', '你':'You'});
    eq(api.transliterate('axb𠮷你🚀',{unknown:'?'}),'ab Ji You?');
    const live=api.transliterate.setData();live.x='Custom';
    eq(api.transliterate('x'),'Custom');
    api.transliterate.setData({y:'Y'});live.x='Detached';
    eq(api.transliterate('x'),'Custom');
    api.transliterate.setData(undefined,true);
    eq(api.transliterate('xъ🚀',{unknown:'?'}),'x?');
    api.slugify.setData(undefined,true);
    eq(api.slugify('hello世界'),'hello-shi-jie');
  }
  report.push({id:variant.id,assertions:assertions-before,passed:true});
}
fs.writeFileSync(path.join(dir,process.argv[3]??'prototype-api-parity.json'),JSON.stringify({assertions,report},null,2)+'\n');
console.log(JSON.stringify({assertions,report},null,2));
