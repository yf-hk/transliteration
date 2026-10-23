import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {charmap} from '../../data/charmap';
import {Transliterate as Before} from './before-source/transliterate';
import {Transliterate as After,defaultOptions} from '../../src/common/transliterate';
import type {IntervalArray} from '../../src/types';
const report=[];
for(const spans of [128,512,2048]) {
 const source='你é '.repeat(spans);
 for(const [name,Engine] of [['before',Before],['after',After]] as const) {
  let indexedReads=0;
  const ranges:IntervalArray=Array.from({length:spans},(_,i)=>[i*3,i*3]);
  const observed=new Proxy(ranges,{get(target,key,receiver){if(typeof key==='string'&&Number.isInteger(Number(key)))indexedReads++;return Reflect.get(target,key,receiver);}});
  assert.equal(new Engine({},charmap).codeMapReplace(source,defaultOptions,observed),'你 e '.repeat(spans));
  if(name==='after')assert.ok(indexedReads<source.length*10);
  report.push({name,spans,sourceUnits:source.length,indexedReads});
 }
}
writeFileSync(new URL('./interval-reads.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
