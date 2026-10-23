from pathlib import Path
import subprocess,json,hashlib,time
out=Path(__file__).parent
prompt=(out/'opus-08-prompt.md').read_text()
cmd=['claude','--setting-sources','user','--settings','{"disableAllHooks":true}','-p','--model','claude-opus-5-5','--effort','high','--tools','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--disable-slash-commands','--no-session-persistence','--output-format','stream-json','--verbose']
start=time.time()
with (out/'opus-08-response.jsonl').open('w') as stdout,(out/'opus-08-stderr.txt').open('w') as stderr:
 result=subprocess.run(cmd,input=prompt,text=True,stdout=stdout,stderr=stderr)
messages=[]; final={}; models=set()
for line in (out/'opus-08-response.jsonl').read_text().splitlines():
 try: item=json.loads(line)
 except json.JSONDecodeError: continue
 if item.get('type')=='assistant':
  m=item.get('message',{});models.add(m.get('model',''))
  messages += [c.get('text','') for c in m.get('content',[]) if c.get('type')=='text']
 if item.get('type')=='result':final=item
(out/'opus-08-review.md').write_text('\n\n'.join(messages))
receipt={'requestedModel':'claude-opus-5-5','respondingModels':sorted(models),'exitCode':result.returncode,'elapsedSeconds':time.time()-start,'subtype':final.get('subtype'),'isError':final.get('is_error'),'modelUsage':final.get('modelUsage'),'promptSha256':hashlib.sha256(prompt.encode()).hexdigest()}
(out/'opus-08-receipt.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt))
