from pathlib import Path
import hashlib, json, os, shutil, subprocess
from datetime import datetime, timezone
p=Path(__file__).resolve().parent
repo=p.parent.parent
standalone=p/'standalone-tests'
(standalone/'test').mkdir(parents=True,exist_ok=True)
for name in ['package.test.mjs','package-helpers.mjs']:
    shutil.copyfile(repo/'test'/name,standalone/'test'/name)
archive=p/'after.tgz'
result={'startedAt':datetime.now(timezone.utc).isoformat(),'tarball':str(archive),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'runs':[]}
for label, node in [('node20','/Users/administrator/.npm/_npx/a3dea26673f30de8/node_modules/node/bin/node'),('node26','/usr/local/Cellar/node/26.5.0/bin/node')]:
    env=os.environ.copy()
    env['TRANSLITERATION_TARBALL']=str(archive)
    command=[node,'--test','test/package.test.mjs']
    run=subprocess.run(command,cwd=standalone,env=env,capture_output=True,text=True,timeout=150)
    (p/f'{label}-final.stdout.txt').write_text(run.stdout)
    (p/f'{label}-final.stderr.txt').write_text(run.stderr)
    version=subprocess.check_output([node,'--version'],text=True).strip()
    result['runs'].append({'label':label,'node':node,'version':version,'command':command,'cwd':str(standalone),'exitCode':run.returncode,'stdout':f'{label}-final.stdout.txt','stderr':f'{label}-final.stderr.txt'})
    print(f'{label} {version}: exit {run.returncode}',flush=True)
    if run.returncode: raise RuntimeError(run.stderr+run.stdout)
result['completedAt']=datetime.now(timezone.utc).isoformat()
(p/'package-validation.json').write_text(json.dumps(result,indent=2)+'\n')
