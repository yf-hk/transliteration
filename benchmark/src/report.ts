import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  awardWinners,
  compare,
  findRow,
  primaryColumns,
  type Summary,
  summarize,
} from './analysis.js';
import { directory, repository } from './paths.js';
import { hash, tree } from './provenance.js';
import type { Mode, RunResult } from './types.js';

const k = (value: number): string =>
  (value / 1000).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const csvValue = (value: string | number | boolean | null): string =>
  `"${String(value ?? '').replaceAll('"', '""')}"`;
function csv<T extends Record<string, string | number | boolean | null>>(
  rows: T[]
): string {
  if (!rows.length) return '';
  return `${[Object.keys(rows[0]).map(csvValue).join(','), ...rows.map((row) => Object.values(row).map(csvValue).join(','))].join('\n')}\n`;
}
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
export function writeReports(
  result: RunResult,
  output: string,
  updateReadme: boolean,
  rendering: 'measured' | 'regenerated' = 'measured'
): void {
  assert.equal(result.failures.length, 0);
  const rows = summarize(result);
  const primary = primaryColumns(result);
  const winners = awardWinners(result, rows, primary);
  const find = (adapter: string, api: Mode, test: string): Summary =>
    findRow(rows, adapter, api, test);
  const marker = (row: Summary): string =>
    !row.eligible ? '†' : row.exactOutputs !== row.totalOutputs ? '‡' : '';
  function matrix(api: Mode): string {
    const columns = primary.filter((adapter) => adapter.modes.includes(api));
    let table = `| Test | ${columns.map((adapter) => `${adapter.name} ${adapter.displayVersion}`).join(' | ')} |\n| --- | ${columns.map(() => '---:').join(' | ')} |\n`;
    for (const fixture of result.fixtures)
      table += `| ${fixture.id} | ${columns
        .map((adapter) => {
          const row = find(adapter.id, api, fixture.id);
          const value = `${k(row.median)}${marker(row)}`;
          return row.winner
            ? `**🏆 ${value}**${row.overlappingEligibleRange ? '≈' : ''}`
            : value;
        })
        .join(' | ')} |\n`;
    return table;
  }
  const comparisons = compare(result, rows);
  const losses = observedLosses(comparisons);
  const lossContent = renderLosses(losses);
  let improvement =
    '| API / test | Before 2.6.2 k/s | After next k/s | Median gain |\n| --- | ---: | ---: | ---: |\n';
  for (const row of comparisons.filter(
    (item) =>
      item.baseline === 'published-full' &&
      ['ascii', 'latin'].includes(item.test)
  )) {
    assert.equal(row.exactOutputs, row.totalOutputs);
    improvement += `| ${row.api} / ${row.test} | ${k(row.beforeMedian)} (${k(row.beforeMinimum)}–${k(row.beforeMaximum)}) | ${k(row.afterMedian)} (${k(row.afterMinimum)}–${k(row.afterMaximum)}) | **${row.ratio.toFixed(2)}×**${row.interpretation.startsWith('Overlapping') ? '≈' : ''} |\n`;
  }
  const legend = `Thousands of complete strings/second; ${result.protocol.rounds} rotated samples. **🏆** = highest eligible observed median; **≈** = overlapping ranges, so superiority is inconclusive. **†** = ineligible reading (dropped/retained/fallback text or failed reading probe). **‡** = limited reading probe passed, but complete outputs differ from After Full. A probe does not validate every pronunciation. No winner is awarded when every library fails a reading probe.`;
  const scope =
    'Before is the published **2.6.2** release. After is **next (unreleased)**; the working manifest is still 2.6.2. All JavaScript columns were rotated together. Python/Rust/ICU are separately timestamped synchronous resident-process string throughput; startup, IPC, bridge and network costs are excluded. Different runtimes include different string/result-consumption overhead.';
  const matrices = `### Transliteration\n\n${matrix('transliterate')}\n### Slugify\n\n${matrix('slugify')}`;
  const compact = `## Performance\n\n${scope}\n\nThe ASCII/Latin before/after fixtures have identical complete outputs (8/8 each). Observed gains:\n\n${improvement}\n${lossContent.markdown}${legend}\n\n${matrices}\nMeasured ${result.endedAt}, ${result.environment.node}, ${result.environment.cpuModel}. [Method and commands](benchmark/README.md) · [Retained results and ranges](benchmark/RESULTS.md).\n`;
  let report = `# Benchmark results\n\n${scope}\n\n${improvement}\n${lossContent.markdown}${legend}\n\n${matrices}\n## Protocol and validity\n\n`;
  report += `${result.adapters.length} configurations, ${result.samples.length} samples, ${result.samples.reduce((sum, sample) => sum + sample.completedCalls, 0).toLocaleString('en-US')} completed calls, zero errors/failures. ${result.protocol.rounds} rotated rounds, ${result.protocol.targetMs} ms target, ${result.protocol.warmupMs} ms warmup/calibration; one worker timed at a time. Every sample checks completed calls, consumed output units/checksum and stable complete outputs. These are public string API measurements, not an end-to-end application or universal fastest claim.\n\n`;
  report += `Host: ${result.environment.cpuModel}, ${result.environment.logicalCpus} logical CPUs, ${result.environment.platform}/${result.environment.arch}; Node ${result.environment.node}. JavaScript phase ${result.phases.javascript.startedAt}–${result.phases.javascript.endedAt}, load ${JSON.stringify(result.phases.javascript.loadStart)}→${JSON.stringify(result.phases.javascript.loadEnd)}. Cross phase ${result.phases.cross?.startedAt ?? 'unmeasured'}–${result.phases.cross?.endedAt ?? 'unmeasured'}. Background desktop/database work remained active; no samples were discarded. All ranges and coefficients of variation remain in summary.csv.\n\n`;
  report +=
    'Rust uses a locked offline release build with opt3/LTO/one codegen unit and black_box on inputs/results. ICU uses a persistent native C++ converter, Any-Latin; Latin-ASCII, including UTF-8/UTF-16 conversion. Native compilation precedes timing. Python uses pinned packages and its default slugify legacy/auto backend. Dictionary/page/locale-pattern caches are warm; installed slug has no whole-input result cache. No language winner is inferred from deletion, fallback encoding, retained Unicode or a failed reading probe. Japanese Kanji readings fail the probe across these configurations; mixed/long inherit that restriction.\n\n';
  report +=
    '| Configuration | Actual package version | Runtime / options |\n| --- | --- | --- |\n';
  for (const adapter of result.adapters)
    report += `| ${adapter.name} ${adapter.displayVersion} | ${adapter.version} | ${adapter.runtime}; ${adapter.options} |\n`;
  report +=
    '\n## Startup and memory\n\nSingle import/first-call observations exclude process startup and use uncontrolled OS caches. Post-GC warm deltas include saved outputs/JIT/library caches and are not exact library allocations. Cross-runtime startup/memory are unmeasured.\n\n| Configuration | Import ms | First mixed call ms | Warm heap delta MiB | Warm RSS delta MiB |\n| --- | ---: | ---: | ---: | ---: |\n';
  for (const startup of result.startup) {
    const retained = result.memory.find(
      (item) => item.adapter === startup.adapter
    );
    const adapter = result.adapters.find((item) => item.id === startup.adapter);
    if (!retained || !adapter) throw new Error('Missing resource observation');
    report += `| ${adapter.name} ${adapter.displayVersion} | ${startup.importMs.toFixed(2)} | ${startup.firstCallMs.toFixed(3)} | ${(retained.warmDelta.heapUsed / 2 ** 20).toFixed(3)} | ${(retained.warmDelta.rss / 2 ** 20).toFixed(3)} |\n`;
  }
  report += `\n## Browser artifacts\n\n| File | Raw bytes | Gzip 9 | Brotli 5 |\n| --- | ---: | ---: | ---: |\n${result.artifacts.map((artifact) => `| ${artifact.file} | ${artifact.rawBytes} | ${artifact.gzipBytes} | ${artifact.brotliBytes} |`).join('\n')}\n`;
  report += '\n## Artifact provenance\n\n';
  if (result.provenance.archive)
    report += `Previously tested archive: ${result.provenance.archive.bytes} bytes, SHA256 \`${result.provenance.archive.sha256}\`. Its 16 distribution payload files match the measured code. README generation happens after that archive was packed; this is not a byte-identical archive of the newly edited documentation.\n\n`;
  report +=
    'Library source/dist hashes, loaded entries, actual package/runtime/compiler versions and every output/probe/sample are retained in the raw results.json. The compact committed snapshot is RESULTS.md, summary.csv, RESULTS.html and result-summary.json. Detailed timestamped runs remain under ignored results/. Reproduce with the documented TypeScript build/run commands in README.md; before-after.csv in a detailed run includes all paired ranges/output counts, including optional pre-optimization attribution.\n';
  function htmlCell(row: Summary): string {
    const style = row.winner ? 'winner' : row.eligible ? '' : 'invalid';
    const trophy = row.winner ? '🏆 ' : '';
    const overlap = row.winner && row.overlappingEligibleRange ? '≈' : '';
    return `<td class="${style}">${trophy}${k(row.median)}${marker(row)}${overlap}<small>${k(row.minimum)}–${k(row.maximum)}</small></td>`;
  }
  function htmlTable(api: Mode): string {
    const columns = primary.filter((adapter) => adapter.modes.includes(api));
    const header = columns
      .map(
        (adapter) =>
          `<th>${escapeHtml(`${adapter.name} ${adapter.displayVersion}`)}</th>`
      )
      .join('');
    const body = result.fixtures
      .map(
        (fixture) =>
          `<tr><th>${fixture.id}</th>${columns
            .map((adapter) => {
              const row = find(adapter.id, api, fixture.id);
              return htmlCell(row);
            })
            .join('')}</tr>`
      )
      .join('');
    return `<h2>${api}</h2><div class="scroll"><table><thead><tr><th>Test</th>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Benchmark matrix</title><style>body{font:15px system-ui;margin:24px;background:#f7f8f6;color:#18221e}p{max-width:1100px;line-height:1.6}.scroll{overflow:auto;max-height:75vh;border:1px solid #ccd4ce;background:white}table{border-spacing:0;font-variant-numeric:tabular-nums}th,td{padding:12px 16px;white-space:nowrap;border-bottom:1px solid #e3e8e4;text-align:right}thead th{position:sticky;top:0;background:#edf1ed;z-index:2}tr th:first-child{position:sticky;left:0;background:#edf1ed;text-align:left;z-index:1}thead th:first-child{z-index:3}td small{display:block;color:#65716a;font-size:11px}.winner{background:#d9efd9;font-weight:bold}.invalid{color:#7e6870}</style><h1>Before/after library benchmark</h1><p>${escapeHtml(scope)}</p>${lossContent.html}<p>${escapeHtml(legend)}</p>${htmlTable('transliterate')}${htmlTable('slugify')}<p>Median and observed minimum–maximum, k strings/s. See RESULTS.md and summary.csv for method, versions and exact-output counts.</p></html>`;
  writeFileSync(path.join(output, 'summary.csv'), csv(rows));
  writeFileSync(path.join(output, 'winners.csv'), csv(winners));
  writeFileSync(path.join(output, 'before-after.csv'), csv(comparisons));
  writeFileSync(
    path.join(output, 'matrix.md'),
    `${lossContent.markdown}${legend}\n\n${matrices}`
  );
  writeFileSync(path.join(output, 'report.md'), report);
  writeFileSync(path.join(output, 'matrix.html'), html);
  for (const api of ['transliterate', 'slugify'] satisfies Mode[]) {
    const columns = primary.filter((adapter) => adapter.modes.includes(api));
    const pivot = result.fixtures.map((fixture) =>
      Object.fromEntries([
        ['test', fixture.id],
        ...columns.map((adapter) => [
          `${adapter.name} ${adapter.displayVersion}`,
          find(adapter.id, api, fixture.id).median,
        ]),
      ])
    );
    writeFileSync(path.join(output, `${api}-matrix.csv`), csv(pivot));
  }
  assert.deepEqual(
    tree(path.join(repository, 'src')),
    result.provenance.source
  );
  assert.deepEqual(tree(path.join(repository, 'dist')), result.provenance.dist);
  const rendererRevision = verifyHarness(result, rendering);
  const receipt = {
    configurations: result.adapters.length,
    samples: result.samples.length,
    completedCalls: result.samples.reduce(
      (sum, sample) => sum + sample.completedCalls,
      0
    ),
    errors: 0,
    failures: result.failures,
    sourceAndDistUnchanged: true,
    countsChecksumsUnitsAndStabilityPassed: true,
    archivePayload: result.provenance.archive,
    winners,
    comparisons,
    observedLowerThroughput: losses,
    rendererRevision,
    rawResultsSha256: hash(path.join(output, 'results.json')),
    evidence: {} satisfies Record<string, string>,
  };
  const evidence: Record<string, string> = {};
  if (updateReadme) {
    writeSnapshot({
      compact,
      report,
      html,
      summary: csv(rows),
      snapshot: `${JSON.stringify({ ...receipt, versions: result.provenance.versions, phases: result.phases, inputs: result.fixtures.map((fixture) => ({ test: fixture.id, strings: fixture.texts.length })), rawRun: path.relative(repository, output) }, null, 2)}\n`,
    });
    evidence['README.md'] = hash(path.join(repository, 'README.md'));
  }
  for (const name of [
    'results.json',
    'summary.csv',
    'before-after.csv',
    'winners.csv',
    'matrix.md',
    'matrix.html',
    'report.md',
  ])
    evidence[name] = hash(path.join(output, name));
  writeFileSync(
    path.join(output, 'verification.json'),
    `${JSON.stringify({ ...receipt, evidence }, null, 2)}\n`
  );
}

type Comparison = ReturnType<typeof compare>[number];
const preciseRate = (value: number): string =>
  `${(value / 1000).toFixed(3)}k/s`;
function rangeDescription(row: Comparison): string {
  return Math.max(row.beforeMinimum, row.afterMinimum) <=
    Math.min(row.beforeMaximum, row.afterMaximum)
    ? 'overlapping ranges; superiority is inconclusive'
    : 'disjoint observed ranges';
}
function observedLosses(comparisons: Comparison[]) {
  return comparisons
    .filter((row) => row.baseline === 'published-full' && row.ratio < 1)
    .map((row) => {
      let paragraph = `${row.api} / ${row.test}: ${preciseRate(row.beforeMedian)} [${preciseRate(row.beforeMinimum)}–${preciseRate(row.beforeMaximum)}] → ${preciseRate(row.afterMedian)} [${preciseRate(row.afterMinimum)}–${preciseRate(row.afterMaximum)}], ${((1 - row.ratio) * 100).toFixed(2)}% lower median with ${rangeDescription(row)}. Outputs match ${row.exactOutputs}/${row.totalOutputs}.`;
      if (row.exactOutputs !== row.totalOutputs)
        paragraph +=
          ' The lower throughput matters for this configuration; changed outputs prevent isolating an implementation regression.';
      const snapshot = comparisons.find(
        (candidate) =>
          candidate.baseline.startsWith('snapshot-') &&
          candidate.after === row.after &&
          candidate.api === row.api &&
          candidate.test === row.test
      );
      if (snapshot)
        paragraph += ` Against the immediate pre-optimization snapshot, outputs match ${snapshot.exactOutputs}/${snapshot.totalOutputs}: ${preciseRate(snapshot.beforeMedian)} → ${preciseRate(snapshot.afterMedian)}, with ${rangeDescription(snapshot)}.`;
      return { ...row, paragraph };
    });
}
function renderLosses(losses: ReturnType<typeof observedLosses>): {
  markdown: string;
  html: string;
} {
  if (!losses.length) return { markdown: '', html: '' };
  return {
    markdown: `### Lower-throughput workloads\n\n${losses.map((loss) => loss.paragraph).join('\n\n')}\n\n`,
    html: `<h2>Lower-throughput workloads</h2>${losses.map((loss) => `<p>${escapeHtml(loss.paragraph)}</p>`).join('')}`,
  };
}
function verifyHarness(
  result: RunResult,
  rendering: 'measured' | 'regenerated'
) {
  const changes: {
    file: string;
    measuredSha256: string;
    rendererSha256: string;
  }[] = [];
  for (const [file, measuredSha256] of Object.entries(
    result.provenance.harness
  )) {
    const rendererSha256 = hash(path.join(directory, file));
    if (rendererSha256 === measuredSha256) continue;
    assert.equal(rendering, 'regenerated', `Unexpected source change: ${file}`);
    assert.ok(
      ['src/report.ts', '.build/report.js'].includes(file),
      `Measured worker or analysis changed: ${file}`
    );
    changes.push({ file, measuredSha256, rendererSha256 });
  }
  return { kind: rendering, measurementHarnessUnchanged: true, changes };
}

function writeSnapshot({
  compact,
  report,
  html,
  summary,
  snapshot,
}: {
  compact: string;
  report: string;
  html: string;
  summary: string;
  snapshot: string;
}): void {
  const readme = path.join(repository, 'README.md');
  const current = readFileSync(readme, 'utf8');
  const start = '<!-- benchmark-results:start -->';
  const end = '<!-- benchmark-results:end -->';
  const section = `${start}\n${compact}\n${end}\n`;
  const first = current.indexOf(start);
  const last = current.indexOf(end);
  if ((first === -1) !== (last === -1))
    throw new Error('Incomplete README benchmark markers');
  const updated =
    first >= 0
      ? current.slice(0, first) +
        section +
        current.slice(last + end.length).replace(/^\n/, '')
      : current.replace('## License', `${section}\n## License`);
  if (updated === current && first === -1)
    throw new Error('README insertion point not found');
  writeFileSync(readme, updated);
  writeFileSync(path.join(directory, 'RESULTS.md'), report);
  writeFileSync(path.join(directory, 'RESULTS.html'), html);
  writeFileSync(path.join(directory, 'summary.csv'), summary);
  writeFileSync(path.join(directory, 'result-summary.json'), snapshot);
}
