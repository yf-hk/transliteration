import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {dir,repo} from './adapters.mjs';
const require=createRequire(path.join(dir,'deps/package.json'));
const {build}=require('esbuild');
const variants=['eager-object','pages','pooled-offsets','pooled-values','pooled-blocks','packed12-values','pooled-offsets-memo','packed12-hangul-prefix','packed12-codepoints'];
const output=path.join(dir,'prototypes');fs.mkdirSync(output,{recursive:true});
const adapters=[];
const requested=process.argv[2]?.split(',');
for(const variant of [...variants,'pooled-values-ascii','pooled-values-options','packed12-optimized','packed12-linear-spacing','packed12-lean-custom'].filter(v=>!requested||requested.includes(v))) {
  const leanCustom=variant==='packed12-lean-custom';
  const linearSpacing=variant==='packed12-linear-spacing'||leanCustom;
  const base=leanCustom?'packed12-codepoints-target':variant==='packed12-optimized'||linearSpacing?'packed12-codepoints':variant==='pooled-values-ascii'||variant==='pooled-values-options'?'pooled-values':variant;
  const mapper=path.join(dir,`astra/variants/${base}.cjs`);
  const enhanced=variant==='packed12-optimized'||linearSpacing;
  const ascii=variant.endsWith('-ascii')||variant.endsWith('-options')||enhanced;
  const options=variant.endsWith('-options')||enhanced;
  const numeric=variant==='packed12-codepoints'||enhanced;
  const bridge=path.join(output,`${variant}-bridge.ts`);
  fs.writeFileSync(bridge,`import {lookup,materialize${numeric?',lookupCode':''}} from ${JSON.stringify(mapper)};
${numeric?'export {lookupCode};':''}
export const charmap = {};
let ready = false;
export function isDefaultMaterialized(){return ready;}
export function lookupDefault(char){return ready ? charmap[char] : lookup(char);}
export function materializePrivateMap(){return materialize();}
export function ensureDefaultMap(){if(!ready){${leanCustom?'materialize(charmap);':'Object.assign(charmap,materialize());'}ready=true;}return charmap;}
`);
  const plugin={name:'research-compact-mapper',setup(b){
    b.onLoad({filter:/[/\\]data[/\\]charmap\.ts$/},()=>({contents:`export {charmap} from ${JSON.stringify(bridge)};`,loader:'ts'}));
    b.onLoad({filter:/[/\\]src[/\\]common[/\\]transliterate\.ts$/},args=>{
      let contents=fs.readFileSync(args.path,'utf8');
      contents=`import {lookupDefault,ensureDefaultMap,isDefaultMaterialized${numeric?',lookupCode':''}${leanCustom?',materializePrivateMap':''}} from ${JSON.stringify(bridge)};\n`+contents;
      const old="s = this.map[char] ?? opt.unknown ?? '';";
      if(!contents.includes(old)) throw new Error('Lookup source changed');
      contents=contents.replace(old,"s = (this.map === this.defaultMap ? lookupDefault(char) : this.map[char]) ?? opt.unknown ?? '';");
      const setData='setData(data?: Charmap, reset = false): Charmap {';
      if(!contents.includes(setData)) throw new Error('setData source changed');
      if(leanCustom){
        const before=contents.slice(contents.indexOf(setData),contents.indexOf('\n  /**\n   * Main transliterate function'));
        const after=before.replace('this.map = deepClone(this.defaultMap);','this.map = isDefaultMaterialized() ? deepClone(this.defaultMap) : materializePrivateMap();')
          .replace('this.map = deepClone(this.map);','this.map = this.map === this.defaultMap && !isDefaultMaterialized() ? materializePrivateMap() : deepClone(this.map);')
          .replace('return this.map;','return this.map === this.defaultMap ? ensureDefaultMap() : this.map;');
        if(after===before)throw new Error('setData refinement failed');contents=contents.replace(before,after);
      }else contents=contents.replace(setData,setData+'\n    ensureDefaultMap();');
      if(ascii) contents=contents.replace('    let index = 0;',String.raw`    if (!isDefaultMaterialized() && this.map === this.defaultMap && /^[\x20-\x7e]*$/.test(str)) return str;
    let index = 0;`);
      if(numeric) contents=contents.replace('    let index = 0;',`    if (!isDefaultMaterialized() && this.map === this.defaultMap && ignoreRanges.length === 0 && !(opt.fixChineseSpacing && hasChinese(str))) {
      let output = '';
      for (let pos = 0; pos < str.length; pos++) {
        let code = str.charCodeAt(pos);
        if (code >= 0xd800 && code <= 0xdbff && pos + 1 < str.length) {
          const low = str.charCodeAt(pos + 1);
          if (low >= 0xdc00 && low <= 0xdfff) {code = 0x10000 + ((code - 0xd800) << 10) + low - 0xdc00; pos++;}
        }
        output += lookupCode(code) ?? opt.unknown ?? '';
      }
      return output;
    }
    let index = 0;`);
      if(options) {
        const oldOptions=`const opt: OptionsTransliterate = deepClone({
      ...this.options,
      ...opts,
    });`;
        if(!contents.includes(oldOptions)) throw new Error('Option source changed');
        contents=contents.replace(oldOptions,`const opt: OptionsTransliterate = {...defaultOptions,...this.confOptions,...opts};`);
      }
      if(linearSpacing) {
        const edits=[
          ['    let lastCharIsNumber = false;',"    let lastCharIsNumber = false;\n    let lastOutputChar = '';"],
          ['hasPunctuationOrSpace(result.slice(-1))','hasPunctuationOrSpace(lastOutputChar)'],
          ['        lastCharIsNumber = charIsNumber;','        lastCharIsNumber = charIsNumber;\n        lastOutputChar = s.slice(-1);'],
        ];
        for(const [before,after] of edits){if(contents.split(before).length!==2)throw new Error('Chinese spacing source changed');contents=contents.replace(before,after);}
      }
      return {contents,loader:'ts'};
    });
    if(enhanced) {
      b.onLoad({filter:/[/\\]src[/\\]common[/\\]utils\.ts$/},args=>{
        const source=fs.readFileSync(args.path,'utf8');
        const marker="  const rule = new RegExp(regexp.source, `${regexp.flags.replace('g', '')}g`);";
        if(!source.includes(marker))throw new Error('Replacement helper changed');
        return {contents:source.replace(marker,marker+'\n  if (ignoreRanges.length === 0) return source.replace(rule, () => replacement);'),loader:'ts'};
      });
      b.onLoad({filter:/[/\\]src[/\\]common[/\\]slugify\.ts$/},args=>{
        const source=fs.readFileSync(args.path,'utf8');
        const marker='const opt: OptionsSlugify = deepClone({ ...this.options, ...opts });';
        if(!source.includes(marker))throw new Error('Slug options changed');
        return {contents:source.replace(marker,'const opt: OptionsSlugify = {...defaultOptions,...this.confOptions,...opts};'),loader:'ts'};
      });
    }
  }};
  const outfile=path.join(output,`${variant}.cjs`);
  await build({entryPoints:[path.join(repo,'src/node/index.ts')],outfile,plugins:[plugin],bundle:true,minify:true,platform:'neutral',format:'cjs',target:'es2020',logLevel:'silent'});
  adapters.push({id:`prototype-${variant}`,module:outfile,package:null,modes:['transliterate','slugify']});
}
const saved=path.join(dir,'prototype-adapters.json');
const previous=requested&&fs.existsSync(saved)?JSON.parse(fs.readFileSync(saved,'utf8')):[];
fs.writeFileSync(saved,JSON.stringify([...previous.filter(a=>!adapters.some(b=>a.id===b.id)),...adapters],null,2)+'\n');
console.log(adapters.map(a=>a.id).join('\n'));
