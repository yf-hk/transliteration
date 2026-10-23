import {lookup,materialize} from "/Users/administrator/Projects/Open Source/transliteration/repo/research/2026-10-23-performance/astra/variants/pooled-blocks.cjs";
export const charmap = {};
let ready = false;
export function isDefaultMaterialized(){return ready;}
export function lookupDefault(char){return ready ? charmap[char] : lookup(char);}
export function ensureDefaultMap(){if(!ready){Object.assign(charmap,materialize());ready=true;}return charmap;}
