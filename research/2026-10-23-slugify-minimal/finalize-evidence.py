from pathlib import Path
import hashlib, json, shutil, subprocess
from datetime import datetime, timezone
p=Path(__file__).resolve().parent
repo=p.parent.parent
read=lambda name: json.loads((p/name).read_text())
sha=lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
result=read('results-final.json')
entry=repo/'dist/node/src/node/index.js'
measured=next(a for a in result['adapters'] if a['id']=='ours-after')['entrySha256']
assert sha(entry)==measured
artifacts={}
for current in sorted((repo/'dist').rglob('*')):
    if current.is_file():
        relative=current.relative_to(repo/'dist')
        assert current.read_bytes()==(p/'candidate-final-dist'/relative).read_bytes()
        assert current.read_bytes()==(p/'package-after/dist'/relative).read_bytes()
        artifacts[str(relative)]=sha(current)
for name in ['index','latin']:
    relative=f'node/src/node/{name}.d.ts'
    assert (repo/'dist'/relative).read_bytes()==(p/'before-dist'/relative).read_bytes()
sourceFiles=['src/common/slugify.ts','src/common/transliterate.ts','src/common/utils.ts']
receipt={'createdAt':datetime.now(timezone.utc).isoformat(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=repo,text=True).strip(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'measuredEntrySha256':measured,'finalEntryMatchesMeasured':True,'allArtifactsMatchMeasuredSnapshotAndPackedTree':True,'declarationsByteIdenticalToBaseline':True,'sourceHashes':{name:sha(repo/name) for name in sourceFiles},'artifactHashes':artifacts,'tarballSha256':sha(p/'after.tgz'),'runtimeSourceDiff':subprocess.check_output(['git','diff','--numstat','--',*sourceFiles],cwd=repo,text=True).strip(),'checks':{'buildUnitCoveragePackageTypesLint':'passed; final-check.txt','baselineDifferential':read('parity.json'),'exactNode20':'19/19 passed; node20-final.stdout.txt','exactNode26':'19/19 passed on identical archive retry; node26-final.stdout.txt','initialNode26':'18/19; large-stdin CLI returned null status near the existing 5000ms deadline; node26-first.stdout.txt','gitDiffCheck':subprocess.run(['git','diff','--check'],cwd=repo,capture_output=True,text=True).returncode},'graft':{'sourceAndCallerCalls':6,'freshnessCalls':1,'estimatesReturned':4,'reportedTokensSaved':19451,'committedGraph':'freshness reports no local manifest and stale structure for research helper additions'},'committed':False,'pushed':False,'released':False}
assert receipt['checks']['gitDiffCheck']==0
(p/'final-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
shutil.copyfile('/tmp/transliteration-minimal-final-check.txt',p/'final-check.txt')
validation={'tarball':str(p/'after.tgz'),'sha256':receipt['tarballSha256'],'tests':19,'runtimeRuns':[{'runtime':'v20.0.0','binary':'/Users/administrator/.npm/_npx/a3dea26673f30de8/node_modules/node/bin/node','passed':19,'failed':0,'log':'node20-final.stdout.txt'},{'runtime':'v26.5.0','binary':'/usr/local/Cellar/node/26.5.0/bin/node','passed':19,'failed':0,'log':'node26-final.stdout.txt','priorRun':{'passed':18,'failed':1,'log':'node26-first.stdout.txt','detail':'Null subprocess status in large-stdin check at the existing five-second deadline. The same archive passed the full retry with that deadline unchanged.'}}]}
(p/'package-validation.json').write_text(json.dumps(validation,indent=2)+'\n')
summary=read('footprint-summary.json')
rows={}
for row in result['summary']: rows[row['fixture'],row['adapter']]=row
speed=[]
for fixture in ['ascii','latin']:
    before=rows[fixture,'ours-before']; after=rows[fixture,'ours-after']; other=rows[fixture,'slugify']
    fmt=lambda x:f"{x['median']/1000:.1f}k ({x['min']/1000:.1f}k to {x['max']/1000:.1f}k)"
    speed.append(f"| {fixture.title()} | {fmt(before)} | {fmt(after)} | {after['median']/before['median']:.2f}x | {fmt(other)} |")
report='''# Lean slugify performance changes

The production candidate speeds up short ASCII and accented Latin slug generation with 19 net additional runtime source lines. Runtime dependencies remain zero. This work is uncommitted on `codex/modern-tooling-benchmarks` at baseline `d1be1f35e48911b00377dcf5efd299aa74d50000`.

## Measured public-call throughput

All values are calls per second. Each cell reports the median and full range from five rotated rounds on the same compiler and Node 26.5.0.

| Input | Before | Final candidate | Gain | slugify 1.6.9 |
| --- | ---: | ---: | ---: | ---: |
'''+ '\n'.join(speed)+'''

The final candidate's ranges exceed both comparison ranges in this run. All 16 ASCII and Latin comparison outputs match exactly. Timed loops consume output fingerprints and output lengths, count completed calls, check stability, and report zero errors. CJK is excluded from this ranking because slugify drops characters that this package transliterates.

The process workers use 150 ms warmup, 25 ms calibration, and a 350 ms target per sample. The host is shared and busy, so these are fixture-specific measurements rather than a promise for every application. The public conversion call is timed in full. Imports and separate profiling runs are excluded. See [results-final.json](results-final.json), [run.mjs](run.mjs), and [worker.mjs](worker.mjs).

## What changed

`Slugify.slugify` takes one deep options snapshot and passes it to the shared transliteration body. The previous default slug path made four recursive snapshots. Snapshot timing, caller-owned regex state, nested replacement rules, and live map changes during input coercion are preserved.

`regexpReplaceCustom` uses native replacement when there are no ignored spans. It retains a cloned global regex and a function replacement, so literal dollar signs, sticky rules, Unicode stepping, and zero-width matches keep their existing behavior.

The default cleanup combines sanitization and separator collapse, then trims separators with a fixed regex. Other options retain the general path. The fast path requires the default allowed-character string, a `-` separator, and an actual empty ignore array. It adds no cache or alternate character mapper.

The runtime diff is 34 added and 22 removed lines in `slugify.ts`, 9 added and 5 removed in `transliterate.ts`, and 3 added in `utils.ts`. Final deslop removed a duplicated assertion and found no need for more runtime abstraction or guards. Existing toolchain and benchmark changes are preserved.

## Opus 5.5 consultation

Both completed replies identify the exact responding model as `claude-opus-5-5`. The first endorsed the snapshot and native-replacement changes. The bounded second consultation endorsed fused default cleanup and challenged its guard. One earlier follow-up stalled and was stopped before the bounded retry. See [first review](opus-01-review.md), [second review](opus-02-review.md), and their [first](opus-01-receipt.json) and [second](opus-02-receipt.json) model receipts.

The `allowedChars` nullish-fallback concern is resolved by the baseline, which already used the same fallback. The ignore concern was valid: `{}`, `0`, and `{length: 0}` could bypass the old error. The final empty-array guard restores those errors, and a focused unit test and baseline differential cover them. Pipeline order is unchanged. Export checks and byte-identical declarations confirm the removed internal getters are absent from the public contract. Reentrancy tests verify the deep snapshot and maps changed during input coercion. The suggested manual edge-trim optimization was left out to keep the accepted change focused.

## Size and memory

| Artifact | Raw byte change | gzip byte change |
| --- | ---: | ---: |
| Full Node bundle | +212 | +90 |
| Latin Node bundle | +235 | +88 |
| Full browser ESM | +212 | +87 |
| Full browser UMD | +212 | +78 |
| Latin browser ESM | +235 | +86 |
| Latin browser UMD | +235 | +87 |

The archive grows from 550,118 to 551,623 bytes, a 1,505-byte or 0.27% increase including source maps. JavaScript and declaration filenames, browser globals, aliases, legacy entry points, and jsDelivr metadata are retained.

Five alternating fresh-process runs on Node 26.5.0 measure median warmed post-GC heap at 7,519,536 bytes before and 7,481,048 after. Median warmed RSS is 74,592,256 before and 71,888,896 after. RSS varies with the allocator and host, and this is retained memory after 10,000 calls rather than peak memory or proof of a long-term leak absence. See [footprint-summary.json](footprint-summary.json) and [raw measurements](footprint-final.json).

## Limits and remaining cost

Custom separator, ignore, and replacement options have higher medians after the change. Long mixed input ranges overlap, so the long-input result is inconclusive. No universal speedup is claimed. The separate 150,000-call profile moves `codeMapReplace` from 14.1% to 32.6% of self samples, making character mapping the largest remaining individual hotspot. Profiles explain the result and are not used as timings. See [general-option measurements](results-options.json), [before profile](profile-before.json), and [after profile](profile-after.json).

## Validation evidence

`bun run check` passes the build, 118 unit tests, 19 package tests, TypeScript, and Biome. Function coverage is 100% and line coverage is 99.87%. See [final-check.txt](final-check.txt).

The final differential has 326,698 passing assertions against saved compiled baseline artifacts. It covers every BMP code point through transliterate and slugify in full and Latin builds, biased cleanup and Unicode fuzzing, supplementary characters, ignored spans, replacement and regex edges, configuration mutation, live maps, and reentrancy. New regression expectations also passed on the untouched baseline. See [parity.json](parity.json), [verify.mjs](verify.mjs), and [baseline-regressions.json](baseline-regressions.json).

The identical final archive passes all 19 installed-package checks on exact Node 20.0.0 and 26.5.0. Installation uses an empty cache and `--offline --omit=dev --ignore-scripts`. One initial Node26 run returned null subprocess status in the large-stdin test near its existing five-second deadline. The full retry passed with the same archive and unchanged deadline. The first run is retained in [node26-first.stdout.txt](node26-first.stdout.txt). Final runs are [Node20](node20-final.stdout.txt) and [Node26](node26-final.stdout.txt), with [archive validation metadata](package-validation.json). Browser UMD and ESM execution is covered in Node VM tests; this work does not claim a new physical-browser or network CDN deployment validation.

The final runtime bytes match the measured snapshot and the packed tree. Full and Latin declarations are byte-identical to baseline. [final-receipt.json](final-receipt.json) records source hashes, every distribution hash, the archive hash, validation status, and Graft evidence. No commit, push, or release was performed. Existing unrelated `graft/` and `research/` work is preserved.
'''
(p/'REPORT.md').write_text(report)
print(json.dumps({'measuredHash':measured,'tarballSha256':receipt['tarballSha256'],'runtimeDiff':receipt['runtimeSourceDiff'],'report':str(p/'REPORT.md')},indent=2))
