import { describe, expect, it } from 'vitest';
import { chromosomeStats } from './chromosomeStats';

describe('chromosomeStats', () => {
  it('covers chromosomes 1 through 22 and X, in that order', () => {
    expect(chromosomeStats.map((row) => row.chromosome)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
      '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', 'X'
    ]);
  });

  it('carries GRCh38 base-pair lengths', () => {
    const byName = Object.fromEntries(chromosomeStats.map((row) => [row.chromosome, row]));
    // GRCh38. GRCh37 would be 249250621 and 155270560 respectively.
    expect(byName['1'].basePairs).toBe(248956422);
    expect(byName.X.basePairs).toBe(156040895);
  });

  it('reports the percentage as HRC entries over TopMed entries', () => {
    // Not the mapping success rate (mappedInHrc / hg19Entries), which runs 97-99%.
    for (const row of chromosomeStats) {
      const share = (row.hg19Entries / row.topmedEntries) * 100;
      expect(row.hrcVsTopmedPct).toBeCloseTo(share, 3);
    }
  });

  it('never reports more mapped entries than HRC entries', () => {
    for (const row of chromosomeStats) {
      expect(row.mappedInHrc).toBeLessThanOrEqual(row.hg19Entries);
    }
  });

  it('partitions the TopMed rows across the three Mapped_in_HRC outcomes', () => {
    // merge_hrc_topmed.py classifies every TopMed row as 'Y', 'N' or '.', so the
    // three columns must add up to the TopMed total exactly. If they ever stop
    // adding up, the upstream file changed meaning.
    for (const row of chromosomeStats) {
      expect(row.mappedInHrc + row.notFoundInHrc + row.notComparableToHg19).toBe(
        row.topmedEntries
      );
    }
  });

  it('points every row at its own ideogram asset', () => {
    for (const row of chromosomeStats) {
      expect(row.ideogram).toBe(`/assets/images/chromosomes/chr${row.chromosome}.svg`);
    }
  });
});
