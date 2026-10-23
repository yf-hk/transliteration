import importlib.metadata
import json
import sys
import time

name = sys.argv[1]
if name == 'python-unidecode':
    from unidecode import unidecode as convert
    package = 'Unidecode'
elif name == 'python-text-unidecode':
    from text_unidecode import unidecode as convert
    package = 'text-unidecode'
elif name == 'python-anyascii':
    from anyascii import anyascii as convert
    package = 'anyascii'
elif name == 'python-slugify':
    from slugify import slugify as convert
    package = 'python-slugify'
else:
    raise ValueError(name)

for line in sys.stdin:
    request = json.loads(line)
    texts = request['texts']
    expected = [convert(s) for s in texts]
    assert all(isinstance(s, str) for s in expected)

    def run(count):
        checksum = 0
        units = 0
        for i in range(count):
            value = convert(texts[i % len(texts)])
            assert isinstance(value, str)
            units += len(value)
            checksum = (checksum + len(value) + (ord(value[0]) if value else 0) + (ord(value[-1]) if value else 0)) & 0xffffffff
        return checksum, units, count

    started = time.perf_counter()
    while time.perf_counter() - started < 0.012:
        run(len(texts))
    count = len(texts)
    while True:
        start = time.perf_counter()
        run(count)
        elapsed = time.perf_counter() - start
        if elapsed >= 0.012:
            break
        count *= 2
    count = max(len(texts), __import__('math').ceil(count * request['targetMs'] / (elapsed * 1000) / len(texts)) * len(texts))
    cpu_start = time.process_time()
    start = time.perf_counter()
    checksum, units, completed = run(count)
    elapsed = time.perf_counter() - start
    cpu_ms = (time.process_time() - cpu_start) * 1000
    expected_checksum = (sum(len(v) + (ord(v[0]) if v else 0) + (ord(v[-1]) if v else 0) for v in expected) * (count // len(texts))) & 0xffffffff
    expected_units = sum(map(len, expected)) * (count // len(texts))
    assert checksum == expected_checksum and units == expected_units
    assert [convert(s) for s in texts] == expected
    result = {'id': name, 'package': package, 'version': importlib.metadata.version(package), 'runtime': sys.version.split()[0],
              'fixture': request['fixture'], 'mode': 'slugify' if name == 'python-slugify' else 'transliterate',
              'iterations': count, 'elapsedMs': elapsed * 1000, 'operationsPerSecond': count / elapsed,
              'inputMiBPerSecond': count * sum(len(s.encode('utf8')) for s in texts) / len(texts) / elapsed / 2**20,
              'cpuMs': cpu_ms, 'cpuToWallRatio': cpu_ms / (elapsed * 1000), 'checksum': checksum,
              'expectedChecksum': expected_checksum, 'outputUnits': units, 'expectedOutputUnits': expected_units,
              'completedCalls': completed, 'errors': 0, 'stable': True, 'outputs': expected,
              'probeOutputs': {key: convert(text) for key, text in request['probes'].items()}}
    print(json.dumps(result), flush=True)
