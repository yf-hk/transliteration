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
