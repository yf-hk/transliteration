import importlib.metadata
import json
import sys
import time

request = json.load(sys.stdin)
name = request['id']
if name == 'python-unidecode':
    from unidecode import unidecode as fn
    package = 'Unidecode'
elif name == 'python-text-unidecode':
    from text_unidecode import unidecode as fn
    package = 'text-unidecode'
elif name == 'python-anyascii':
    from anyascii import anyascii as fn
    package = 'anyascii'
elif name == 'python-slugify':
    from slugify import slugify as fn
    package = 'python-slugify'
else:
    raise ValueError(name)
texts = request['texts']
expected = [fn(s) for s in texts]
assert all(isinstance(s, str) for s in expected)
checksum = 0

def run(count):
    global checksum
    for i in range(count):
        value = fn(texts[i % len(texts)])
        checksum = (checksum + len(value) + (ord(value[-1]) if value else 0)) & 0xffffffff

run(256)
count = 32
while True:
    start = time.perf_counter()
    run(count)
    elapsed = time.perf_counter() - start
    if elapsed >= 0.03:
        break
    count *= 2
count = max(32, round(count * request['targetMs'] / (elapsed * 1000) / 32) * 32)
cpu_start = time.process_time()
start = time.perf_counter()
run(count)
elapsed = time.perf_counter() - start
cpu_ms = (time.process_time() - cpu_start) * 1000
errors = sum(fn(s) != value for s, value in zip(texts, expected))
input_bytes = count * sum(len(s.encode('utf8')) for s in texts) / len(texts)
print(json.dumps({'id': name, 'package': package, 'version': importlib.metadata.version(package),
                  'runtime': sys.version.split()[0], 'workload': request['workload'],
                  'mode': 'slugify' if name == 'python-slugify' else 'transliterate',
                  'iterations': count, 'elapsedMs': elapsed * 1000,
                  'opsPerSec': count / elapsed, 'mibPerSec': input_bytes / elapsed / 2**20,
                  'cpuMs': cpu_ms, 'checksum': checksum, 'errors': errors,
                  'outputEmpty': sum(not s for s in expected), 'outputs': expected}))
