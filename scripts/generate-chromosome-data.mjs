/**
 * Generates the chromosome ideogram SVGs and the statistics rows behind
 * Data > Statistics (annoq-site-v2#22).
 *
 * Inputs (both committed, neither read by the app at runtime):
 *   metadata/ideogram_9606_GCF_000001305.16_850_V1.txt
 *     NCBI Genome Decoration Page, GRCh38, 850-band. Supplies both the
 *     cytogenetic banding and each chromosome's length, so the drawing and
 *     the "# of base pairs" column cannot disagree about the assembly.
 *   metadata/merge_hrc_topmed_stats.json
 *     Per-chromosome TopMed and HRC r1.1 counts. Produced by
 *     annoq-data-builder/wgsa_add/merge_hrc_topmed.py, which appends the
 *     Mapped_in_HRC column to the TopMed WGSA output by checking each TopMed
 *     variant's hg19 coordinates against the raw HRC r1.1 reference VCF.
 *
 * Outputs are committed. Re-run with: npm run generate:chromosome-data
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const IDEOGRAM_FILE = resolve(root, 'metadata/ideogram_9606_GCF_000001305.16_850_V1.txt');
const STATS_FILE = resolve(root, 'metadata/merge_hrc_topmed_stats.json');
const SVG_DIR = resolve(root, 'public/assets/images/chromosomes');
const DATA_FILE = resolve(root, 'src/data/chromosomeStats.ts');

// Numeric order, then X. The stats JSON is keyed lexicographically, which
// interleaves 1, 10, 11 ... 2, 20 -- never iterate it directly.
const CHROMOSOMES = [...Array.from({ length: 22 }, (_, index) => String(index + 1)), 'X'];

// Giemsa stain intensities, lightest to darkest, plus the three special bands.
const STAIN_FILL = {
  gneg: '#f7f7f7',
  gpos25: '#c9c9c9',
  gpos50: '#9a9a9a',
  gpos75: '#6b6b6b',
  gpos100: '#3c3c3c',
  gvar: '#b8c6e0',
  stalk: '#8aa0bf',
  acen: '#b03a34'
};

// Chromosomes are far longer than they are wide, and the short ones have to
// keep looking like chromosomes: at 18 wide the 46Mb of chr21 came out square.
const SVG_WIDTH = 12;
// chr1 is drawn at this height and every other chromosome is scaled against it,
// so chr21 reads as visibly short rather than every row looking the same size.
const MAX_HEIGHT = 132;

const round = (value) => Math.round(value * 100) / 100;

function parseIdeogram(text) {
  const byChromosome = new Map(CHROMOSOMES.map((chromosome) => [chromosome, []]));

  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [chromosome, arm, , , , bpStart, bpStop, stain, density] = line.split('\t');
    const bands = byChromosome.get(chromosome);
    if (!bands) continue; // skips Y and the unplaced scaffolds

    const key = stain === 'gpos' ? `gpos${(density ?? '').trim()}` : stain;
    if (!(key in STAIN_FILL)) {
      throw new Error(`Unknown stain "${key}" on chromosome ${chromosome}`);
    }
    bands.push({ arm, start: Number(bpStart) - 1, stop: Number(bpStop), stain: key });
  }

  for (const [chromosome, bands] of byChromosome) {
    if (!bands.length) throw new Error(`No bands found for chromosome ${chromosome}`);
    bands.sort((a, b) => a.start - b.start);
  }
  return byChromosome;
}

function ideogramSvg(chromosome, bands, longest) {
  const length = bands[bands.length - 1].stop;
  const height = Math.max(8, round((length / longest) * MAX_HEIGHT));
  const scale = height / length;
  const width = SVG_WIDTH;

  const shapes = bands.map((band) => {
    const y = round(band.start * scale);
    const bandHeight = Math.max(0.4, round((band.stop - band.start) * scale));
    const fill = STAIN_FILL[band.stain];

    // The centromere is drawn as two triangles meeting at a point, the way a
    // karyotype pinches it, rather than as two more flat bands.
    if (band.stain === 'acen') {
      return band.arm === 'p'
        ? `<path d="M0,${y} H${width} L${width / 2},${round(y + bandHeight)} Z" fill="${fill}"/>`
        : `<path d="M${width / 2},${y} L${width},${round(y + bandHeight)} H0 Z" fill="${fill}"/>`;
    }
    return `<rect y="${y}" width="${width}" height="${bandHeight}" fill="${fill}"/>`;
  });

  // Cap the cap: a fixed width/2 radius swallowed the whole of a short
  // chromosome and drew chr19 and chr21 as circles.
  const radius = round(Math.min(width / 2, height / 4));

  const clipId = `chr${chromosome}-body`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Chromosome ${chromosome} ideogram">
<title>Chromosome ${chromosome} ideogram</title>
<defs><clipPath id="${clipId}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}"/></clipPath></defs>
<g clip-path="url(#${clipId})">${shapes.join('')}</g>
<rect x="0.4" y="0.4" width="${round(width - 0.8)}" height="${round(height - 0.8)}" rx="${round(Math.max(radius - 0.4, 0))}" ry="${round(Math.max(radius - 0.4, 0))}" fill="none" stroke="#5b6b82" stroke-width="0.8"/>
</svg>
`;
}

const bandsByChromosome = parseIdeogram(readFileSync(IDEOGRAM_FILE, 'utf8'));
const lengths = new Map(
  [...bandsByChromosome].map(([chromosome, bands]) => [chromosome, bands[bands.length - 1].stop])
);
const longest = Math.max(...lengths.values());
const stats = JSON.parse(readFileSync(STATS_FILE, 'utf8'));

mkdirSync(SVG_DIR, { recursive: true });
mkdirSync(dirname(DATA_FILE), { recursive: true });

const rows = CHROMOSOMES.map((chromosome) => {
  const entry = stats[chromosome];
  if (!entry) {
    throw new Error(`merge_hrc_topmed_stats.json has no entry for chromosome ${chromosome}`);
  }
  writeFileSync(
    resolve(SVG_DIR, `chr${chromosome}.svg`),
    ideogramSvg(chromosome, bandsByChromosome.get(chromosome), longest)
  );
  return {
    chromosome,
    basePairs: lengths.get(chromosome),
    topmedEntries: entry.topmed_rows,
    hg19Entries: entry.hrc_snp_rows,
    mappedInHrc: entry.mapped_Y,
    notFoundInHrc: entry.mapped_N,
    notComparableToHg19: entry.mapped_dot,
    hrcVsTopmedPct: entry.hrc_vs_topmed_pct,
    ideogram: `/assets/images/chromosomes/chr${chromosome}.svg`
  };
});

const header = `// Generated by scripts/generate-chromosome-data.mjs -- do not edit by hand.
//
// Sources:
//   metadata/ideogram_9606_GCF_000001305.16_850_V1.txt
//     NCBI Genome Decoration Page ideogram table, GRCh38, 850-band resolution.
//     Supplies the cytogenetic banding drawn into the SVGs and the base-pair
//     length of each chromosome (the largest bp_stop on that chromosome).
//   metadata/merge_hrc_topmed_stats.json
//     Per-chromosome TopMed and HRC r1.1 counts, produced by
//     annoq-data-builder/wgsa_add/merge_hrc_topmed.py.
//
// mapped_Y, mapped_N and mapped_dot partition topmed_rows exactly: every TopMed
// row is classified by its Mapped_in_HRC value, which merge_hrc_topmed.py sets
// to 'Y', 'N' or '.'.
//
// Regenerate with: npm run generate:chromosome-data

export type ChromosomeStat = {
  /** Chromosome name, "1" through "22" and "X". */
  chromosome: string;
  /** Length in base pairs on GRCh38. */
  basePairs: number;
  /** Variant rows in TopMed (hg38). */
  topmedEntries: number;
  /**
   * Biallelic SNP rows in the raw HRC r1.1 reference VCF (hg19/GRCh37). Indels and
   * multiallelic rows are skipped by merge_hrc_topmed.py's lookup builder.
   */
  hg19Entries: number;
  /** TopMed rows whose hg19 chr/pos/ref/alt matches an HRC r1.1 SNP (Mapped_in_HRC = Y). */
  mappedInHrc: number;
  /** TopMed rows compared against HRC r1.1 and not found there (Mapped_in_HRC = N). */
  notFoundInHrc: number;
  /**
   * TopMed rows never compared, because their hg19 reference allele disagrees with
   * hg38 (the ref_hg19=ref_hg38 flag is not 'Y'), so there is no hg19 key to look up
   * (Mapped_in_HRC = '.').
   */
  notComparableToHg19: number;
  /** hg19Entries as a percentage of topmedEntries, as reported upstream. */
  hrcVsTopmedPct: number;
  /** Site-absolute path to the generated ideogram SVG. */
  ideogram: string;
};

export const chromosomeStats: ChromosomeStat[] = [
`;

const body = rows
  .map((row) => {
    const fields = [
      `chromosome: '${row.chromosome}'`,
      `basePairs: ${row.basePairs}`,
      `topmedEntries: ${row.topmedEntries}`,
      `hg19Entries: ${row.hg19Entries}`,
      `mappedInHrc: ${row.mappedInHrc}`,
      `notFoundInHrc: ${row.notFoundInHrc}`,
      `notComparableToHg19: ${row.notComparableToHg19}`,
      `hrcVsTopmedPct: ${row.hrcVsTopmedPct}`,
      `ideogram: '${row.ideogram}'`
    ];
    return `  { ${fields.join(', ')} }`;
  })
  .join(',\n');

writeFileSync(DATA_FILE, `${header}${body}\n];\n`);
console.log(`wrote ${rows.length} chromosomes and ${rows.length} ideograms`);
