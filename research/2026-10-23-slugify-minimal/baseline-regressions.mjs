import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { regexpReplaceCustom } from './before-source/src_common_utils.ts';

const require=createRequire(import.meta.url);
const api=require('./before-dist/node/src/node/index.js');
let assertions=0;
const eq=(actual,expected)=>{assert.deepEqual(actual,expected);assertions++;};
eq(regexpReplaceCustom('aba',/a/g,'$&$$$1'),'$&$$$1b$&$$$1');
eq(regexpReplaceCustom('aba',/a/g,'$&',['missing']),'$&b$&');
const pattern=/(?:)/gu;pattern.lastIndex=2;
eq(regexpReplaceCustom('🚀a',pattern,'|'),'|🚀|a|');eq(pattern.lastIndex,2);
eq(regexpReplaceCustom('a😀b',/(?:)/,'-'),'-a-\ud83d-\ude00-b-');
eq(regexpReplaceCustom('aa',/(?<=a)/,'-'),'a-a-');
eq(regexpReplaceCustom('aab',/a/y,'-'),'--b');eq(regexpReplaceCustom('baab',/a/y,'-'),'baab');
eq(api.slugify('--foo--- ! --bar-._~--'),'foo-bar-._~');eq(api.slugify('---'),'');eq(api.slugify('._~'),'._~');eq(api.slugify(' hello ',{separator:undefined}),'-hello-');
for(const convert of [api.transliterate,api.slugify]){
 const options={ignore:['!'],replace:{x:'before'}};
 const source={toString(){options.ignore.length=0;options.replace.x='after';return'x!';}};
 eq(Reflect.apply(convert,undefined,[source,options]),'before!');
 const replaceAfter=[['Mapped','snapshot']];
 const reentrant={toString(){replaceAfter[0][1]='changed';replaceAfter.push(['snapshot','late']);convert.config({replaceAfter:[['Mapped','configured']]});convert.setData({x:'Mapped'});return'x';}};
 eq(Reflect.apply(convert,undefined,[reentrant,{replaceAfter}]),'snapshot');eq(convert('x'),'configured');
 convert.config(undefined,true);convert.setData(undefined,true);
}
writeFileSync(new URL('./baseline-regressions.json',import.meta.url),JSON.stringify({assertions,passed:true},null,2)+'\n');
console.log(`${assertions} regression expectations pass on the untouched baseline.`);
