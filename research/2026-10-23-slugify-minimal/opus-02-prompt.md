Astra response and user steering: I accept the snapshot, clone, literal replacement and state-preservation constraints. Graft and source search show the options getters are internal: package entries export only bound functions/config/setData, .d.ts does not expose classes, tests neither read options nor override transliterate. The candidate implements A+B, keeps replacement-array clones and reads the map after String(source). It passed 16 targeted tests and 271,106 differential assertions against an untouched same-compiler baseline, including all BMP code units, full/Latin APIs, options, shared/live custom maps and reentrant input coercion. We will add your nested replaceAfter mutation/setData-in-coercion cases and test baseline expectations. Final package checks will cover Node20/26 and standalone UMD/ESM.

IMPORTANT new direct user correction: "No, I still want it to improve the performance, not only the bloated issue". Performance is PRIMARY; lean code/size/memory and correctness constrain the approach. We must not reject additional measured improvements solely to keep a two-change cap. Target: meaningful production gains versus baseline and aim to surpass slugify1.6.9 on matching-output ASCII/Latin. Same-compiler candidate benchmarks are running.

Please respond to this correction and challenge the next smallest candidate if A+B does not beat Latin. Possibilities: (1) precompile only the three immutable default slug regexes, select them by effective separator/allowedChars primitive values, and use native cleanup directly when ignore is empty (avoids helper regex cloning and repeated separator escaping); keep custom option fallback, no unbounded cache/state. (2) use numeric UTF16 surrogate bounds in place of two per-character regex tests; (3) store the last emitted fragment character rather than repeatedly slicing the growing Chinese output (prior parity/scaling prototype proved this). We will not automatically import compact mapper architecture/ASCII exposure flags, but may evaluate further if measurements justify original speed/size/memory goals. Endorse the smallest high-payoff path and give concrete counterexamples or guard requirements. Keep the answer <=600 words and focus on production choices; do not repeat the initial analysis.

Here is your previous review for discussion context:
**Reviewer: Claude Opus 5.5 (`claude-opus-5-5`).** This review is spec-level reasoning only; I ran no tools. Before applying A or B, run the new tests on unmodified HEAD to confirm every expected value below.

### Verdict
Ship A and B as one patch, and defer all of C. Neither change affects the exported API, as long as checks B2 and B3 below hold.

### A: endorse
```ts
const ignoreRanges = findStrOccurrences(source, ignored);
const rule = new RegExp(regexp.source, `${regexp.flags.replace('g', '')}g`);
if (ignoreRanges.length === 0) {
  // Function replacer keeps `replacement` literal (no `$&`/`$1` expansion)
  return source.replace(rule, () => replacement);
}
```
Why the fast path is exact:
- With no ranges, the existing loop emits `replacement` for every match. Non-empty matches go through `cursor < end`, and empty ones through `!inRange(start, [])`.
- `matchAll` and `@@replace` run the same exec loop on the fresh `g` clone. lastIndex starts at 0, empty matches advance via `AdvanceStringIndex` (full-Unicode for `u`/`v`), sticky stops at the first failure, and indices are monotonic.
- So zero-width matches, surrogate stepping, lookbehind and `y` all behave the same.

Constraints:
- Keep the `rule` clone in the fast path. It forces `g` and protects the caller's `lastIndex`.
- Never pass `replacement` directly as the replaceValue. `$` patterns would expand, and a function value (reachable via `replace: [['a', fn]]`) would become a replacer.
- Accept one divergence without adding code. `+=` coerces with the default hint (valueOf first), while `@@replace` uses ToString (toString first). Only objects with their own `valueOf ≠ toString` differ, which is type-violating input. All primitives and plain functions behave identically; symbols throw at the first match either way.

### B: worth it
The smaller alternative, making the getters shallow, still leaves two deep clones on the slug path. It also leaves a public getter that leaks the module-level default arrays. B removes more code than it adds.

```ts
transliterate(source: string, options?: OptionsTransliterate): string {
  const opts = typeof options === 'object' ? options : {};
  return this.transliterateWithOptions(
    source,
    deepClone({ ...defaultOptions, ...this.confOptions, ...opts })
  );
}

protected transliterateWithOptions(source: string, opt: OptionsTransliterate): string {
  // existing body from `// force convert to string`, byte-identical
}
```
- In Slugify, use `const opt = deepClone({ ...defaultOptions, ...this.confOptions, ...opts })`, then `this.transliterateWithOptions(str, opt)`.
- Delete both `get options()` getters.

Why B is exact: today's inner re-merge `{...slugOptions, ...opt}` is fully overwritten, because `opt` already carries every key. Both confOptions reads also already happen before `String(source)`.

Must-checks:
1. The snapshot must stay deep and happen before coercion. Don't move `this.map` (or anything else) above `String(source)`. Today, a `toString` that calls `setData()` affects the in-flight call.
2. Keep the `typeof options === 'object'` guard verbatim; `null` spreads harmlessly. Add no default params, because the bound functions' `fn.length` is observable.
3. Deleting the getters is safe only if:
   - no entry (node, browser, latin, standalone UMD/ESM) or emitted `.d.ts` exposes the classes, and
   - no test reads `.options` or spies on `transliterate`.
   
   Slugify will no longer go through `this.transliterate`, so confirm nothing overrides it.
4. The inherited `Slugify#transliterate` will now merge base defaults instead of slug defaults. This is unobservable, since the body never reads slug-only keys, and it isn't exported.
5. Keep the `formatReplaceOption` and `replaceString` clones. They aren't hot by default, and they protect the snapshot from the `item[0]` mutation.

### Essential regression cases (green on HEAD, then after)
- **Literal `$`:** `transliterate('abc', { replaceAfter: [['b', '$&$1$$']] })` → `'a$&$1$$c'`; `slugify('a b', { separator: '$&' })` → `'a$&b'`.
- **`regexpReplaceCustom` directly:**
  - `'a😀b'` with `/(?:)/u` → `'-a-😀-b-'`
  - `'a😀b'` with `/(?:)/` → `'-a-\uD83D-\uDE00-b-'`
  - `/(?<=a)/` on `'aa'` → `'a-a-'`
  - `/a/y` on `'aab'` → `'--b'`, and on `'baa'` → `'baa'`
- **Caller regex:** with `re = /b/gy; re.lastIndex = 5`, using `re` in `replaceAfter` on `'bb'` gives `'xx'`, and `re.lastIndex` is still 5.
- **Ignore:** given but absent (fast path), and present (old path), including a zero-width match at an ignored boundary.
- **Reentrancy:** a source whose `toString` mutates `opts.replaceAfter[0][1]`, pushes a tuple, and calls `config()`/`setData()`. Outputs must equal HEAD; the nested mutation catches a shallow-snapshot regression. Reset afterwards, because the exports are shared singletons.
- **Slug options reach the body:** `slugify('a b', { replaceAfter: [['a', 'x']] })` → `'x-b'`; Chinese spacing on and off; `trim`/`unknown` set via `slugify.config`.
- **Live config:**
  - mutate the value returned by `config()`, then call
  - `config(undefined, true)`
  - per-call options beat config
  - explicit `{ separator: undefined }`
  - `null` and string options
- **Package tests** across the full, Latin, UMD and ESM builds.

### Reject as bloat or scope creep
- ASCII bypass, exposure flags, regex or result caches, a mapper rewrite, or the research prototype.
- `structuredClone` or JSON cloning: functions throw, and prototype/regex semantics differ.
- A shallow snapshot.
- A `$`-escaped string-replaceValue fast path.
- Reusing the caller's regex.
- Dropping the replace-array clones.
- Folding `Slugify.config` into the base class.

Measure separately later, not in this patch: `charCodeAt` surrogate checks in `codeMapReplace`.

### Evidence for the final review
- Diff confined to `utils.ts`, `transliterate.ts`, `slugify.ts` and tests.
- New tests shown green on HEAD before the change.
- Full suite, typecheck and Biome output.
- Before/after benchmark on the same harness, with profile deltas for `deepClone` and `regexpReplaceCustom`.

CURRENT DIFF:
diff --git a/src/common/slugify.ts b/src/common/slugify.ts
index c5a9807..11e3dfa 100644
--- a/src/common/slugify.ts
+++ b/src/common/slugify.ts
@@ -16,10 +16,6 @@ export const defaultOptions: OptionsSlugify = {
 };
 
 export class Slugify extends Transliterate {
-  get options(): OptionsSlugify {
-    return deepClone({ ...defaultOptions, ...this.confOptions });
-  }
-
   /**
    * Set default config
    * @param options
@@ -41,12 +37,16 @@ export class Slugify extends Transliterate {
    */
   slugify(str: string, options?: OptionsSlugify): string {
     const opts = typeof options === 'object' ? options : {};
-    const opt: OptionsSlugify = deepClone({ ...this.options, ...opts });
+    const opt: OptionsSlugify = deepClone({
+      ...defaultOptions,
+      ...this.confOptions,
+      ...opts,
+    });
 
     // remove leading and trailing separators
     const sep: string = opt.separator ? escapeRegExp(opt.separator) : '';
 
-    let slug: string = this.transliterate(str, opt);
+    let slug: string = this.transliterateWithOptions(str, opt);
 
     slug = regexpReplaceCustom(
       slug,
diff --git a/src/common/transliterate.ts b/src/common/transliterate.ts
index 0e2d37f..f3a5a35 100644
--- a/src/common/transliterate.ts
+++ b/src/common/transliterate.ts
@@ -33,10 +33,6 @@ export const defaultOptions: OptionsTransliterate = {
 };
 
 export class Transliterate {
-  get options(): OptionsTransliterate {
-    return deepClone({ ...defaultOptions, ...this.confOptions });
-  }
-
   protected confOptions: OptionsTransliterate;
   protected defaultMap: Charmap;
   protected map: Charmap;
@@ -216,10 +212,18 @@ export class Transliterate {
   transliterate(source: string, options?: OptionsTransliterate): string {
     const opts = typeof options === 'object' ? options : {};
     const opt: OptionsTransliterate = deepClone({
-      ...this.options,
+      ...defaultOptions,
+      ...this.confOptions,
       ...opts,
     });
 
+    return this.transliterateWithOptions(source, opt);
+  }
+
+  protected transliterateWithOptions(
+    source: string,
+    opt: OptionsTransliterate
+  ): string {
     // force convert to string
     let str = typeof source === 'string' ? source : String(source);
 
diff --git a/src/common/utils.ts b/src/common/utils.ts
index ffb1dfd..6da25ae 100644
--- a/src/common/utils.ts
+++ b/src/common/utils.ts
@@ -165,6 +165,9 @@ export function regexpReplaceCustom(
 ): string {
   const ignoreRanges = findStrOccurrences(source, ignored);
   const rule = new RegExp(regexp.source, `${regexp.flags.replace('g', '')}g`);
+  if (ignoreRanges.length === 0) {
+    return source.replace(rule, () => replacement);
+  }
   let result = '';
   let lastIndex = 0;
   let ignoreIndex = 0;
