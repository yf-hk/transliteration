import {lookup,materialize,lookupCode} from "/Users/administrator/Projects/Open Source/transliteration/repo/research/2026-10-23-performance/astra/variants/packed12-codepoints-target.cjs";
export {lookupCode};
export const charmap = {};
let ready = false;
export function isDefaultMaterialized(){return ready;}
export function lookupDefault(char){return ready ? charmap[char] : lookup(char);}
export function materializePrivateMap(){return materialize();}
export function ensureDefaultMap(){if(!ready){materialize(charmap);ready=true;}return charmap;}
