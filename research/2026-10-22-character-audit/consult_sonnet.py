"""Submit a frozen review packet to the exact model/effort requested by user."""
import json
import subprocess
import sys
import time
from pathlib import Path

packet = Path(sys.argv[1]).resolve()
out = packet.with_suffix('.response.json')
command = ['claude', '-p', '--model', 'claude-sonnet-5-5', '--effort', 'medium',
           '--tools', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
           '--setting-sources', '', '--no-session-persistence', '--output-format', 'json']
started = time.time()
result = subprocess.run(command, input=packet.read_text(), text=True,
                        capture_output=True, timeout=900)
out.write_text(result.stdout)
packet.with_suffix('.stderr.txt').write_text(result.stderr)
receipt = dict(model_requested='claude-sonnet-5-5', effort_requested='medium',
               command=command, exit_code=result.returncode, elapsed_seconds=round(time.time()-started,2),
               packet=packet.name, response=out.name)
try:
    payload = json.loads(result.stdout)
    receipt.update(model_usage=payload.get('modelUsage'), is_error=payload.get('is_error'),
                   subtype=payload.get('subtype'))
    packet.with_suffix('.review.md').write_text(payload.get('result',''))
except json.JSONDecodeError:
    receipt['parse_error'] = True
packet.with_suffix('.receipt.json').write_text(json.dumps(receipt, indent=2))
print(json.dumps(receipt))
