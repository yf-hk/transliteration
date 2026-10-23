import assert from 'node:assert/strict';
import type { Metadata, Mode, RunResult } from './types.js';

const median = (values: number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export function summarize(result: RunResult) {
  return result.audits.map((audit) => {
    const samples = result.samples.filter(
      (sample) =>
        sample.adapter === audit.adapter &&
        sample.mode === audit.mode &&
        sample.fixture === audit.fixture
    );
    assert.equal(samples.length, result.protocol.rounds);
    for (const sample of samples) {
      assert.equal(sample.errors, 0);
      assert.equal(sample.completedCalls, sample.iterations);
      assert.equal(sample.checksum, sample.expectedChecksum);
      assert.equal(sample.outputUnits, sample.expectedOutputUnits);
      assert.equal(sample.stable, true);
    }
    const reference = result.audits.find(
      (item) =>
        item.adapter === 'ours-full' &&
        item.mode === audit.mode &&
        item.fixture === audit.fixture
    );
    if (!reference)
      throw new Error('Reports require the current full reference adapter');
    const metadata = result.adapters.find((item) => item.id === audit.adapter);
    if (!metadata) throw new Error('Missing adapter metadata');
    const rates = samples.map((sample) => sample.operationsPerSecond);
    const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const exact = audit.outputs.filter(
      (value, index) => value.output === reference.outputs[index].output
    ).length;
    const eligible =
      audit.flags.length === 0 &&
      ['ascii-only', 'probe-matched-only'].includes(audit.assessment);
    return {
      adapter: audit.adapter,
      library: `${metadata.name} ${metadata.displayVersion}`,
      api: audit.mode,
      test: audit.fixture,
      version: metadata.version,
      displayVersion: metadata.displayVersion,
      runtime: metadata.runtime,
      samples: samples.length,
      median: median(rates),
      minimum: Math.min(...rates),
      maximum: Math.max(...rates),
      coefficientOfVariation:
        rates.length > 1
          ? Math.sqrt(
              rates.reduce((sum, rate) => sum + (rate - mean) ** 2, 0) /
                (rates.length - 1)
            ) / mean
          : 0,
      eligible,
      flags: audit.flags.join('|'),
      assessment: audit.assessment,
      exactOutputs: exact,
      totalOutputs: audit.outputs.length,
      completedCalls: samples.reduce(
        (sum, sample) => sum + sample.completedCalls,
        0
      ),
      winner: false,
      overlappingEligibleRange: false,
    };
  });
}
export type Summary = ReturnType<typeof summarize>[number];
export function primaryColumns(result: RunResult) {
  const primary = result.adapters.filter(
    (adapter) => !adapter.id.startsWith('snapshot-')
  );
  const position = (id: string): number =>
    id === 'published-full'
      ? -3
      : id === 'ours-full'
        ? -2
        : id === 'ours-latin'
          ? -1
          : result.adapters.findIndex((item) => item.id === id);
  primary.sort((left, right) => position(left.id) - position(right.id));
  return primary;
}
export function findRow(
  rows: Summary[],
  adapter: string,
  api: Mode,
  test: string
): Summary {
  const row = rows.find(
    (item) => item.adapter === adapter && item.api === api && item.test === test
  );
  if (!row) throw new Error(`Missing row ${adapter}/${api}/${test}`);
  return row;
}
export function awardWinners(
  result: RunResult,
  rows: Summary[],
  primary: Metadata[]
) {
  return (['transliterate', 'slugify'] satisfies Mode[]).flatMap((api) =>
    result.fixtures.map((fixture) => {
      const candidates = rows
        .filter(
          (row) =>
            row.api === api &&
            row.test === fixture.id &&
            row.eligible &&
            primary.some((adapter) => adapter.id === row.adapter)
        )
        .sort((a, b) => b.median - a.median);
      const winner = candidates[0];
      if (winner) {
        winner.winner = true;
        winner.overlappingEligibleRange = candidates
          .slice(1)
          .some(
            (row) =>
              Math.max(row.minimum, winner.minimum) <=
              Math.min(row.maximum, winner.maximum)
          );
      }
      return {
        api,
        test: fixture.id,
        winner: winner?.library ?? '',
        median: winner?.median ?? null,
        rangeInterpretation: !winner
          ? 'No eligible reading'
          : winner.overlappingEligibleRange
            ? 'Fastest observed median; ranges overlap, superiority inconclusive'
            : 'Fastest eligible observed median; disjoint observed ranges',
      };
    })
  );
}
export function compare(result: RunResult, rows: Summary[]) {
  const comparisons = [];
  for (const baseline of [
    'published-full',
    'snapshot-full',
    'snapshot-latin',
  ]) {
    const afterId = baseline === 'snapshot-latin' ? 'ours-latin' : 'ours-full';
    for (const before of rows.filter((row) => row.adapter === baseline)) {
      const after = findRow(rows, afterId, before.api, before.test);
      const beforeAudit = result.audits.find(
        (audit) =>
          audit.adapter === baseline &&
          audit.mode === before.api &&
          audit.fixture === before.test
      );
      const afterAudit = result.audits.find(
        (audit) =>
          audit.adapter === afterId &&
          audit.mode === before.api &&
          audit.fixture === before.test
      );
      if (!beforeAudit || !afterAudit) throw new Error('Missing paired audit');
      const matches = beforeAudit.outputs.filter(
        (value, index) => value.output === afterAudit.outputs[index].output
      ).length;
      const overlap =
        Math.max(before.minimum, after.minimum) <=
        Math.min(before.maximum, after.maximum);
      comparisons.push({
        before: before.library,
        after: after.library,
        baseline,
        api: before.api,
        test: before.test,
        beforeMedian: before.median,
        beforeMinimum: before.minimum,
        beforeMaximum: before.maximum,
        afterMedian: after.median,
        afterMinimum: after.minimum,
        afterMaximum: after.maximum,
        ratio: after.median / before.median,
        exactOutputs: matches,
        totalOutputs: before.totalOutputs,
        interpretation: interpretation(
          matches === before.totalOutputs,
          overlap,
          after.minimum > before.maximum
        ),
      });
    }
  }
  return comparisons;
}

function interpretation(
  exact: boolean,
  overlap: boolean,
  faster: boolean
): string {
  if (!exact) return 'Different outputs; cannot isolate a speedup';
  if (overlap) return 'Overlapping ranges; inconclusive';
  return faster ? 'Faster observed range' : 'Slower observed range';
}
