import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
let seed=0x23abad1;
const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
const alphabet=['你','好','a','é','🚀','\ud83d','\ude80',' ','!','\ud800','\udc00','1'];
const cases=Array.from({length:3000},()=>{
 const input=Array.from({length:next()%80},()=>alphabet[next()%alphabet.length]).join('');
 const start=next()%(input.length+1);
 const ignore=[input.slice(start,start+(next()%7)),alphabet[next()%alphabet.length],alphabet[next()%alphabet.length]+alphabet[next()%alphabet.length]];
 const options={ignore,fixChineseSpacing:Boolean(next()%2),unknown:'?',separator:['-','--','$&'][next()%3]};
 if(next()%3===0)options.replace=[[/()/gu,'$&']];
 if(next()%3===0)options.replaceAfter=[[/a/y,'$1']];
 return {input,options};
});
let assertions=0;
for(const name of ['index','latin']) {
 const before=require(`./before-dist/node/src/node/${name}.js`);
 const after=require(fileURLToPath(new URL(`../../dist/node/src/node/${name}.js`,import.meta.url)));
 for(const mode of ['transliterate','slugify']) {
  for(const custom of [false,true]) {
   try {
    if(custom)for(const api of [before,after])api[mode].setData({'你':'','好':'你好','é':' !','🚀':'🚀z'});
    for(const {input,options} of cases) {
     assert.equal(after[mode](input,options),before[mode](input,options),`${name}/${mode}/${custom}/${JSON.stringify(input)}`);
     assertions++;
    }
   }finally{if(custom)for(const api of [before,after])api[mode].setData(undefined,true);}
  }
 }
}
const report={runtime:process.version,seed:0x23abad1,cases:cases.length,assertions,errors:0,fullAndLatin:true,defaultAndCustomMaps:true};
writeFileSync(new URL('./ignored-parity.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
