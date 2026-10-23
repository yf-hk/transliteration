import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const api=require('./before-dist/node/src/node/index.js');
const text='你é '.repeat(16384),expected='你 e '.repeat(16384);
for(let i=0;i<30;i++)assert.equal(api.transliterate(text,{ignore:['你']}),expected);
