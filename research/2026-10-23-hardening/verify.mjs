import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtures } from '../../benchmark/fixtures.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../..');
const require = createRequire(import.meta.url);
let assertions = 0;
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); assertions++; };
function fresh(file) { delete require.cache[require.resolve(file)]; return require(file); }
function outcome(convert, input, options) {
  try { return {value: convert(input, options)}; }
  catch (error) { return {error: error.name, message: error.message}; }
}

const inputs = [...fixtures.flatMap(fixture => fixture.texts), '', '\ud800x\udc00', 'a\u0301中', 'a\x00b\x7fc', 'a🚀b', '你好SKU12', 'C++ C#', '$& $$ $1', '-', '---', '--a--b--', 'a-_-b', '._~', 'a - b', ' a ', 'a\u2010b', 'a\u00a0b', '😀a😀', 'İ', 'ß', 'K'];
const options = [undefined, null, {}, {unknown:'?'}, {fixChineseSpacing:false}, {trim:true}, {ignore:['你好','SKU12','C++','🚀']}, {ignore:['']}, {ignore:['absent']},
  {replace:[['hello','世界']]}, {replaceAfter:[['Ni Hao','Hello']]}, {replace:{a:'$&$$$1'}},
  {replace:[[/()/gu,'$&']]}, {replace:[[/^|$/gu,'$&']]}, {replace:[[/a/gy,'$&']]},
  {replaceAfter:[[/()/gu,'$&']]}, {ignore:['你好'],replace:[[/()/gu,'x']]},
  {allowedChars:undefined}, {allowedChars:null}, {allowedChars:''}, {allowedChars:'a-zA-Z0-9'},
  {separator:'--'}, {separator:'$&'}, {separator:'$$'}, {separator:'[.]'}, {separator:''}, {separator:undefined}, {separator:null},
  {lowercase:false}, {uppercase:true}, {uppercase:true,lowercase:true},
  {ignore:{}}, {ignore:0}, {ignore:{length:0}}, {ignore:''}, {ignore:'-'}, {ignore:null}, {ignore:undefined},
  {allowedChars:'a-zA-Z0-9-_.~'}, {allowedChars:'a-z-'}, {replace:{a:'-'}}, {replace:[['b',' - ']]}, {unknown:'-'},
  {unknown:' word-with-punctuation! '}, {ignore:['C++'], replace:{'你好':'C++'}},
];
let seed = 0x5eed1234;
const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
const alphabet = ['a', '-', '_', '.', '~', ' ', '\t', '!', 'é', '中', '😀', '\ud800', '\udc00', 'K', 'İ'];
const fuzz = Array.from({length: 5000}, () => Array.from({length: next() % 40}, () => alphabet[next() % alphabet.length]).join(''));
const report = [];
const cleanupInputs = [''];
let level = [''];
for (let length = 1; length <= 5; length++) {
  level = level.flatMap(prefix => ['a', '-', ' ', '!', '_', '.', '~'].map(char => prefix + char));
  cleanupInputs.push(...level);
}
for (const name of ['index','latin']) {
  const beforeFile = path.join(directory,`before-dist/node/src/node/${name}.js`);
  const afterFile = path.join(repository,`dist/node/src/node/${name}.js`);
  const before = fresh(beforeFile), after = fresh(afterFile);
  const start = assertions;
  for (const input of fuzz) { const opt = options[next() % options.length]; eq(outcome(after.slugify,input,opt),outcome(before.slugify,input,opt), `${name} biased fuzz ${JSON.stringify(input)}`); }
  for (const input of cleanupInputs) eq(after.slugify(input),before.slugify(input),`${name} cleanup ${JSON.stringify(input)}`);
  for (const mode of ['transliterate','slugify']) {
    const old = before[mode], current = after[mode];
    const expectedMap = old.setData();
    eq(current.setData(), expectedMap, `${name}/${mode} complete map`);
    for(let code=0;code<65536;code++) {
      const input=String.fromCharCode(code);
      eq(current(input,{unknown:'?',fixChineseSpacing:false}),old(input,{unknown:'?',fixChineseSpacing:false}),`${name}/${mode} U+${code.toString(16)}`);
    }
    for(const input of inputs) for(const option of options) eq(outcome(current,input,option),outcome(old,input,option),`${name}/${mode} options ${JSON.stringify(input)}`);
    for(const convert of [old,current]) {
      const rules=[[/a/g,'X']]; rules[0][0].lastIndex=2;
      const ignored=['b']; const settings={replace:rules,ignore:ignored};
      convert('aba',settings);
      eq(rules[0][0].lastIndex,2,'caller regex lastIndex');
      eq(rules[0][1],'X','caller replacement'); eq(ignored,['b'],'caller ignore');
    }
  }
  for(const mode of ['transliterate','slugify']) {
    function mutations(file) {
      const api=fresh(file), convert=api[mode], result=[];
      const config=convert.config({replace:[['x','old']],ignore:['Y'],unknown:'?'});
      config.replace.push(['z','new']);result.push(convert('xYz🚀'));
      const settings={replace:[['x','call']],ignore:['Y']};
      const source={toString(){settings.replace[0][1]='changed';settings.ignore.length=0;config.replace[0][1]='mutated';return 'xY';}};
      result.push(Reflect.apply(convert,undefined,[source,settings]));
      result.push(convert('xY'));convert.config(undefined,true);result.push(convert('xY'));
      const map=convert.setData({'x':'','🚀':'ROCKET','\ud800':'LONE','你':'You'});
      result.push(convert('x🚀\ud800你',{unknown:'?'}));map.x='Live';result.push(convert('x'));
      convert.setData({y:'Y'});map.x='Detached';result.push(convert('x'));
      convert.setData(undefined,true);result.push(convert('x🚀',{unknown:'?'}));
      return result;
    }
    eq(mutations(afterFile),mutations(beforeFile),`${name}/${mode} mutation snapshots`);
    function mapDuringCoercion(file) {
      const api=fresh(file), convert=api[mode];
      const replaceAfter=[['Mapped','snapshot']];
      const source={toString(){replaceAfter[0][1]='changed';replaceAfter.push(['snapshot','late']);convert.config({replaceAfter:[['Mapped','configured']]});convert.setData({x:'Mapped'});return 'x';}};
      return [Reflect.apply(convert,undefined,[source,{replaceAfter}]),convert('x')];
    }
    eq(mapDuringCoercion(afterFile),mapDuringCoercion(beforeFile),`${name}/${mode} reentrant map change`);
  }
  function sharing(file) {
    const api=fresh(file),map=api.transliterate.setData(),result=[];
    map.x='Shared';result.push(api.slugify('x'));
    api.transliterate.setData({x:'Private'});map.x='Changed';
    result.push(api.transliterate('x'),api.slugify('x'));
    api.transliterate.setData(undefined,true);result.push(api.transliterate('x'));
    return result;
  }
  eq(sharing(afterFile),sharing(beforeFile),`${name} live map sharing`);
  report.push({build:name,assertions:assertions-start,passed:true});
}
writeFileSync(path.join(directory,'parity.json'),JSON.stringify({runtime:process.version,assertions,report},null,2)+'\n');
console.log(JSON.stringify({assertions,report},null,2));
