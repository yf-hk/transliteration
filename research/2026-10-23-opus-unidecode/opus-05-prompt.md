Continue our real Opus5.5 design discussion; <=900 words, tools disabled. Your broad review proposed bounded private pages derived from actual own map data; focused review proposed compact storage/lazy public materialization. We choose to falsify the smaller derived-page lookup hypothesis before changing representation.
New evidence: empty-default-pipeline-only prototype showed no clear gain; combined pipeline+classification improved mixed1.46x and long1.38x with disjoint observed ranges but Latin/Korean still trail Unidecode. No production change. Preserve exact APIs,0deps,smallgzip/heap,live sharedmaps,getters,coercion; no result cache.
Proposed index: extend existing shared WeakMap private state with lazily touched256-entry pages. Outer directory has null prototype. Each touched page has ALL256 OWN data slots defined with ordinary writable/enumerable/configurable attributes, avoiding inherited integer setters or holes. Build mappings from own DATA descriptors only. Any public exposure replaces sharedWeakMapentry with exposed,dropping derivedpages for bothAPIs. Each missing codepoint performs fresh char-in-map check; inheritedkeys trigger restart generic from0 BEFORE any getter. Known empty-string distinctfrommissing. Nativecallback+pages andnumericloop+pages compared toold stringlookup variants in2x2 grid. Classificationseparate. No perinstanceflag.
Your Array(...).fill proposal can invoke inherited integer setters. Array.from({length}) can consult inherited Symbol.iterator. We explicitly avoidboth hazards. Normalintrinsicmethodsassumed, but Object/Array prototype data/getters added after import remainobservable and mustnotbreak.
We are obtaining separate --prof/--prof-process C++ticks forCyrillic/Korean asrequested. Stop if warm dense-script benefit<15%; evaluate15interleavedrounds pairedbootstrap/heldoutinputs,exposurecoldcost/heap/size before selecting. FullNode20/26 parity+API/packageacceptancebeforeproduction.
NEW SOURCE FACT: data/charmap.ts already stores numericchunkarrays and lookup(char), then materializes a plain charmap eagerly (including11172Hangulstrings). This lookup is NOT package-exported. Sol notes blindly reusing it could change actual-map behavior under preimport inheritedsetters or numeric prototype pollution. Relevant source below. Does this change your recommendation? Is deriving safe pages from actual own descriptors still the right bounded experiment, or can we safely reuse the existing private data with a simpler guard? Identify any concrete contract hole in our design. We will send selected patch and measurements for final review. Do not tell us to ship unmeasuredperformancechanges.

```typescript
_[0x98] = x98;
_[0x99] = x99;
_[0x9a] = x9a;
_[0x9b] = x9b;
_[0x9c] = x9c;
_[0x9d] = x9d;
_[0x9e] = x9e;
_[0x9f] = x9f;
_[0xa0] = xa0;
_[0xa1] = xa1;
_[0xa2] = xa2;
_[0xa3] = xa3;
_[0xa4] = xa4;
_[0xa7] = xa7;
_[0xf9] = xf9;
_[0xfa] = xfa;
_[0xfb] = xfb;
_[0xfc] = xfc;
_[0xfd] = xfd;
_[0xfe] = xfe;
_[0xff] = xff;

// Fast lookup function - O(1) with minimal overhead
export function lookup(char: string): string {
  const code = char.charCodeAt(0);
  const high = code >> 8;
  const low = code & 0xff;

  // Check 2D array first
  const chunk = _[high];
  if (chunk) {
    const v = chunk[low];
    if (typeof v === 'string') {
      return v;
    }
  }

  // Korean Hangul (computed)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const o = code - 0xac00;
    return I[(o / 588) | 0] + M[((o % 588) / 28) | 0] + F[o % 28];
  }

  return '';
}

// Build plain charmap object for backwards compatibility with setData/deepClone
// This is a plain object that can be cloned and enumerated
export const charmap: Charmap = {};

// Populate from 2D array
for (let high = 0; high < _.length; high++) {
  const chunk = _[high];
  if (!chunk) continue;
  for (let low = 0; low < chunk.length; low++) {
    const v = chunk[low];
    if (typeof v === 'string') {
      charmap[String.fromCharCode((high << 8) + low)] = v;
    }
  }
}

// Add Korean Hangul (pre-computed for compatibility)
for (let code = 0xac00; code <= 0xd7a3; code++) {
  const o = code - 0xac00;
  charmap[String.fromCharCode(code)] = I[(o / 588) | 0] + M[((o % 588) / 28) | 0] + F[o % 28];
}
```
