# Data Menu Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Data Access" nav item with a `Data` page carrying DataAccess / Data Versions / Statistics sub-route tabs, move the data-versions table onto it, add a per-chromosome statistics table, and drop the TopMed beta toolbar button.

**Architecture:** A thin `DataPage` shell owns tab selection and URL syncing; each of the three tabs is its own component file. The statistics table is driven by a generated TypeScript module and generated SVG ideograms, both produced by one committed Node script from two committed metadata files. The annotation version table, currently duplicated across two pages, is extracted to one component consumed by both.

**Tech Stack:** React 19, react-router-dom 7, MUI 9 (`@mui/material`), TanStack Query 5, Vite, Vitest + Testing Library, plain Node ESM for the generator.

**Spec:** `docs/superpowers/specs/2026-09-11-data-menu-reorganization-design.md`

## Global Constraints

- Branch: `annoq-site-78-add-hrc-mapping-info`. Commit subject line is exactly `For #22` (this repo owns the issue; do **not** use the `For annoq-site/#78` form used by neighbouring commits).
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- Test runner is `npm test` (`vitest run`). `globals: true` is set, but existing files import `describe`/`it`/`expect` from `vitest` explicitly — follow that.
- Run a single file with `npx vitest run <path>`.
- Type-check with `npx tsc -b`. It must pass before every commit.
- Styling: add new rules to `src/styles.css`. Reuse the existing `annoq-table`, `supported-shell`, `supported-tabs-wrap` and `supported-tabs` classes rather than inventing parallel ones.
- The `/version` route and `VersionPage` must keep working. Do not delete them.
- Chromosome order everywhere is `1`–`22` then `X` — numeric, never the JSON's lexicographic key order.
- Generated files (`src/data/chromosomeStats.ts`, `public/assets/images/chromosomes/*.svg`) are committed and never hand-edited.

---

### Task 1: Extract the shared annotation version table

The version table exists twice today: in `SupportedAnnotationsPage.tsx` (the tab being removed in Task 7) and as `VersionContent` in `StaticPages.tsx` (the `/version` page). Extract it once before either consumer moves.

**Files:**
- Create: `src/features/annotations/AnnotationVersionTable.tsx`
- Create: `src/features/annotations/AnnotationVersionTable.test.tsx`
- Modify: `src/pages/StaticPages.tsx` (`VersionContent`, around lines 411-427; imports at lines 1-7)
- Modify: `src/pages/SupportedAnnotationsPage.tsx` (the `versionRows` memo at lines 37-41 and the versions branch at lines 89-113)

**Interfaces:**
- Consumes: `flattenTree` from `src/lib/annotations.ts`; `AnnotationNode` from `src/types.ts`.
- Produces:
  - `annotationVersionRows(tree: AnnotationNode[]): Array<{ name: string; label: string; version: string }>`
  - `AnnotationVersionTable({ tree }: { tree: AnnotationNode[] })` — renders the WGSA credit line plus a two-column table. Used by Task 4's `DataVersionsTab`.

- [ ] **Step 1: Write the failing test**

Create `src/features/annotations/AnnotationVersionTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildAnnotationStore } from '../../lib/annotations';
import type { Annotation } from '../../types';
import { AnnotationVersionTable } from './AnnotationVersionTable';

// Same shape as VersionPage.test.tsx: a second top-level tool arrives before the
// first tool's children, so response order and tree order disagree.
const store = buildAnnotationStore([
  { id: '1', name: 'ANNOVAR', leaf: false, version: 'v1' },
  { id: '2', name: 'VEP', leaf: false, version: 'v2' },
  { id: '3', name: 'ANNOVAR gene', parent_id: '1', leaf: true, version: 'v1a' },
  { id: '4', name: 'VEP consequence', parent_id: '2', leaf: true, version: 'v2a' },
  { id: '5', name: 'no version here', parent_id: '1', leaf: true }
] as Annotation[]);

function toolNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.querySelectorAll('td')[0]?.textContent);
}

describe('AnnotationVersionTable', () => {
  it('lists tools in annotation-tree order', () => {
    render(<AnnotationVersionTable tree={store.tree} />);
    expect(toolNames()).toEqual(['ANNOVAR', 'ANNOVAR gene', 'VEP', 'VEP consequence']);
  });

  it('omits annotations that carry no version', () => {
    render(<AnnotationVersionTable tree={store.tree} />);
    expect(screen.queryByText('no version here')).toBeNull();
  });

  it('prefers the label over the raw name when one is present', () => {
    const labelled = buildAnnotationStore([
      { id: '1', name: 'raw_name', label: 'Readable Name', leaf: true, version: 'v9' }
    ] as Annotation[]);
    render(<AnnotationVersionTable tree={labelled.tree} />);
    expect(screen.getByText('Readable Name')).toBeInTheDocument();
    expect(screen.queryByText('raw_name')).toBeNull();
  });

  it('credits the WGSA build', () => {
    render(<AnnotationVersionTable tree={store.tree} />);
    expect(screen.getByRole('link', { name: 'WGSA' })).toHaveAttribute(
      'href',
      'https://sites.google.com/site/jpopgen/wgsa'
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/annotations/AnnotationVersionTable.test.tsx`
Expected: FAIL — `Failed to resolve import "./AnnotationVersionTable"`.

- [ ] **Step 3: Write the component**

Create `src/features/annotations/AnnotationVersionTable.tsx`:

```tsx
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useMemo } from 'react';
import { flattenTree } from '../../lib/annotations';
import type { AnnotationNode } from '../../types';

const WGSA_URL = 'https://sites.google.com/site/jpopgen/wgsa';

export type AnnotationVersionRow = {
  name: string;
  label: string;
  version: string;
};

/**
 * Tree order, not `store.annotations` order: /annotations lists every category
 * node before any leaf, so the raw array puts unrelated rows next to each other.
 * Walking the tree groups each row under its category. Both callers of this
 * table had independently fixed the same bug; keeping the walk here keeps it
 * fixed in one place.
 */
export function annotationVersionRows(tree: AnnotationNode[]): AnnotationVersionRow[] {
  return flattenTree(tree)
    .filter((annotation) => annotation.version && annotation.name)
    .map((annotation) => ({
      name: annotation.name,
      label: annotation.label || annotation.name,
      version: annotation.version as string
    }));
}

export function AnnotationVersionTable({ tree }: { tree: AnnotationNode[] }) {
  const rows = useMemo(() => annotationVersionRows(tree), [tree]);

  return (
    <>
      <Typography variant="subtitle2" sx={{ p: 1 }}>
        Built using <a href={WGSA_URL} target="_blank" rel="noreferrer">WGSA</a> version 095
      </Typography>
      <Table className="annoq-table">
        <TableHead>
          <TableRow>
            <TableCell>SNP Detail/Annotation Tool</TableCell>
            <TableCell>Version</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell>{row.label}</TableCell>
              <TableCell>{row.version}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/annotations/AnnotationVersionTable.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Point `VersionPage` at the extracted component**

In `src/pages/StaticPages.tsx`, replace the body of `VersionContent` (currently lines 411-427). The loading branch stays on the page; only the table moves.

```tsx
function VersionContent() {
  const annotations = useAnnotations();
  return <SimplePage title="Data Source and Annotation Tool Version Summary">
    {annotations.isLoading ? (
      <Typography>Loading version information...</Typography>
    ) : (
      <AnnotationVersionTable tree={annotations.data?.tree ?? []} />
    )}
  </SimplePage>;
}
```

Add the import near the other feature imports at the top of the file:

```tsx
import { AnnotationVersionTable } from '../features/annotations/AnnotationVersionTable';
```

Then remove the now-unused `flattenAnnotationTree` import (line 7). Leave the `flattenAnnotationTree` export in `src/lib/annotations.ts` alone — `annotations.test.ts` still covers it.

Note the WGSA credit line moves inside the table component, so the page no longer renders its own. That is intended: the credit belongs with the table.

- [ ] **Step 6: Point `SupportedAnnotationsPage` at the extracted component**

In `src/pages/SupportedAnnotationsPage.tsx`, delete the `versionRows` memo (lines 37-41) and replace the whole versions branch (the `<Box className="supported-version-table">` block, lines 89-113) with:

```tsx
<Box className="supported-version-table">
  <AnnotationVersionTable tree={store.tree} />
</Box>
```

Add:

```tsx
import { AnnotationVersionTable } from '../features/annotations/AnnotationVersionTable';
```

and remove the now-unused imports: `useMemo` (keep `useRef`, `useState`), `flattenTree`, and the `Table`, `TableBody`, `TableCell`, `TableHead`, `TableRow` members of the `@mui/material` import.

This branch is deleted entirely in Task 7; it is rewired here so the tree stays green in between.

- [ ] **Step 7: Verify the whole suite and the types**

Run: `npx tsc -b && npm test`
Expected: PASS. `VersionPage.test.tsx` and `SupportedAnnotationsPage.test.tsx` both still pass unchanged — that is the point of this task.

- [ ] **Step 8: Commit**

```bash
git add src/features/annotations/AnnotationVersionTable.tsx \
        src/features/annotations/AnnotationVersionTable.test.tsx \
        src/pages/StaticPages.tsx \
        src/pages/SupportedAnnotationsPage.tsx
git commit -F - <<'MSG'
For #22

Extract AnnotationVersionTable from its two copies.

The annotation version table was rendered independently by the /version
page and by the Supported Annotations page, each having separately fixed
the same tree-order bug. The Data Versions tab needs a third copy, so
pull the table into one component both existing callers now use.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 2: Generate the chromosome statistics data and ideograms

**Files:**
- Create: `metadata/ideogram_9606_GCF_000001305.16_850_V1.txt` (vendored, 863 lines)
- Create: `scripts/generate-chromosome-data.mjs`
- Create (generated): `src/data/chromosomeStats.ts`
- Create (generated): `public/assets/images/chromosomes/chr1.svg` … `chr22.svg`, `chrX.svg` (23 files)
- Modify: `package.json` (scripts block)
- Modify: `metadata/README.md`
- Create: `src/data/chromosomeStats.test.ts`

**Interfaces:**
- Produces:
  - `ChromosomeStat` — `{ chromosome: string; basePairs: number; topmedEntries: number; hg19Entries: number; mappedInHrc: number; hrcVsTopmedPct: number; ideogram: string }`
  - `chromosomeStats: ChromosomeStat[]` — 23 entries in `1`–`22`, `X` order. Consumed by Task 3's `StatisticsTab`.

- [ ] **Step 1: Vendor the NCBI ideogram table**

```bash
curl -sSL --max-time 60 \
  -o metadata/ideogram_9606_GCF_000001305.16_850_V1.txt \
  "https://ftp.ncbi.nlm.nih.gov/pub/gdp/ideogram_9606_GCF_000001305.16_850_V1"
```

Verify it is the GRCh38 table and not GRCh37 before going further:

```bash
wc -l metadata/ideogram_9606_GCF_000001305.16_850_V1.txt
awk -F'\t' 'NR>1 && $1=="1"{if($7>m)m=$7} END{print m}' metadata/ideogram_9606_GCF_000001305.16_850_V1.txt
```

Expected: `863` lines, and chr1 max `bp_stop` of `248956422`. If that number is `249250621` you have fetched GRCh37 — stop and re-check the URL.

> `hgdownload.soe.ucsc.edu` is unreachable from this environment; NCBI's Genome Decoration Page is the source used here and it carries the banding and the assembly lengths in one file.

- [ ] **Step 2: Write the failing test**

Create `src/data/chromosomeStats.test.ts`:

```ts
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

  it('points every row at its own ideogram asset', () => {
    for (const row of chromosomeStats) {
      expect(row.ideogram).toBe(`/assets/images/chromosomes/chr${row.chromosome}.svg`);
    }
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/data/chromosomeStats.test.ts`
Expected: FAIL — `Failed to resolve import "./chromosomeStats"`.

- [ ] **Step 4: Write the generator**

Create `scripts/generate-chromosome-data.mjs`:

```js
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
 *     Per-chromosome TopMed and HRC counts, named by the issue.
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

const SVG_WIDTH = 18;
// chr1 is drawn at this height and every other chromosome is scaled against it,
// so chr21 reads as visibly short rather than every row looking the same size.
const MAX_HEIGHT = 96;

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

  const clipId = `chr${chromosome}-body`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Chromosome ${chromosome} ideogram">
<title>Chromosome ${chromosome} ideogram</title>
<defs><clipPath id="${clipId}"><rect width="${width}" height="${height}" rx="${width / 2}" ry="${width / 2}"/></clipPath></defs>
<g clip-path="url(#${clipId})">${shapes.join('')}</g>
<rect x="0.5" y="0.5" width="${width - 1}" height="${round(height - 1)}" rx="${round(width / 2 - 0.5)}" ry="${round(width / 2 - 0.5)}" fill="none" stroke="#5b6b82" stroke-width="1"/>
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
//     Per-chromosome TopMed and HRC entry counts.
//
// Regenerate with: npm run generate:chromosome-data

export type ChromosomeStat = {
  /** Chromosome name, "1" through "22" and "X". */
  chromosome: string;
  /** Length in base pairs on GRCh38. */
  basePairs: number;
  /** Variant rows in TopMed (hg38). */
  topmedEntries: number;
  /** Variant rows in the HRC hg19 release. */
  hg19Entries: number;
  /** HRC rows that carry Mapped_in_HRC = Y in TopMed. */
  mappedInHrc: number;
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
      `hrcVsTopmedPct: ${row.hrcVsTopmedPct}`,
      `ideogram: '${row.ideogram}'`
    ];
    return `  { ${fields.join(', ')} }`;
  })
  .join(',\n');

writeFileSync(DATA_FILE, `${header}${body}\n];\n`);
console.log(`wrote ${rows.length} chromosomes and ${rows.length} ideograms`);
```

> Build the object literal field by field. An earlier draft emitted `JSON.stringify` and stripped the quotes with a regex, which silently left `"hg19Entries":` quoted because the key contains digits.

- [ ] **Step 5: Add the npm script**

In `package.json`, add to `"scripts"` after `"graphql_codegen"`:

```json
"generate:chromosome-data": "node scripts/generate-chromosome-data.mjs",
```

- [ ] **Step 6: Run the generator**

Run: `npm run generate:chromosome-data`
Expected output: `wrote 23 chromosomes and 23 ideograms`

Sanity-check the output:

```bash
ls public/assets/images/chromosomes | wc -l          # 23
head -1 public/assets/images/chromosomes/chr1.svg    # width="18" height="96"
head -1 public/assets/images/chromosomes/chr21.svg   # height ~18, i.e. much shorter than chr1
grep -c '<path' public/assets/images/chromosomes/chr1.svg  # 2, the two centromere triangles
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/data/chromosomeStats.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 8: Note the new file in the metadata README**

`metadata/README.md` opens with a warning scoping the directory to `annotation_tree.csv` and annoq-site#78. Add a section at the end so the new file is not mistaken for part of that staging:

```markdown
# ideogram_9606_GCF_000001305.16_850_V1.txt

NCBI [Genome Decoration Page](https://ftp.ncbi.nlm.nih.gov/pub/gdp/) ideogram table for *Homo
sapiens*, GRCh38, 850-band resolution. Public domain.

Unrelated to the annotation-tree staging described above, and not affected by annoq-site#78.

Used at build time only, by `scripts/generate-chromosome-data.mjs`, which renders the chromosome
ideograms and the base-pair column for the Data > Statistics table. Together with
`merge_hrc_topmed_stats.json` it produces `src/data/chromosomeStats.ts` and
`public/assets/images/chromosomes/*.svg`, both of which are committed. Regenerate with
`npm run generate:chromosome-data`.

The assembly matters: chromosome 1 must end at 248,956,422 bp (GRCh38), not 249,250,621 (GRCh37).
```

- [ ] **Step 9: Verify types and full suite**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add metadata/ideogram_9606_GCF_000001305.16_850_V1.txt \
        metadata/README.md \
        scripts/generate-chromosome-data.mjs \
        src/data/chromosomeStats.ts \
        src/data/chromosomeStats.test.ts \
        public/assets/images/chromosomes \
        package.json
git commit -F - <<'MSG'
For #22

Generate the chromosome ideograms and statistics rows.

The issue notes the chromosome images and base-pair counts are not
available in the codebase. Vendor NCBI's public-domain GRCh38 ideogram
table and render both from it, so the drawing and the base-pair column
cannot disagree about the assembly, and join it with the per-chromosome
TopMed and HRC counts the issue points at.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 3: Statistics tab

**Files:**
- Create: `src/pages/data/StatisticsTab.tsx`
- Create: `src/pages/data/StatisticsTab.test.tsx`
- Modify: `src/styles.css` (append)

**Interfaces:**
- Consumes: `chromosomeStats`, `ChromosomeStat` from `src/data/chromosomeStats.ts` (Task 2).
- Produces: `StatisticsTab()` — no props. Rendered by Task 5's `DataPage`.

- [ ] **Step 1: Write the failing test**

Create `src/pages/data/StatisticsTab.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatisticsTab } from './StatisticsTab';

describe('StatisticsTab', () => {
  it('renders one row per chromosome, 1-22 then X', () => {
    render(<StatisticsTab />);
    const rows = screen.getAllByRole('row').slice(1); // drop the header row
    expect(rows).toHaveLength(23);
    expect(within(rows[0]).getByText('1')).toBeInTheDocument();
    expect(within(rows[22]).getByText('X')).toBeInTheDocument();
  });

  it('formats counts with thousands separators', () => {
    render(<StatisticsTab />);
    const first = screen.getAllByRole('row')[1];
    // chr1: 248,956,422 bp and 57,577,226 TopMed entries.
    expect(within(first).getByText('248,956,422')).toBeInTheDocument();
    expect(within(first).getByText('57,577,226')).toBeInTheDocument();
  });

  it('gives every chromosome an ideogram with an accessible name', () => {
    render(<StatisticsTab />);
    expect(screen.getByAltText('Chromosome 1 ideogram')).toHaveAttribute(
      'src',
      '/assets/images/chromosomes/chr1.svg'
    );
    expect(screen.getAllByRole('img')).toHaveLength(23);
  });

  it('attributes both data sources below the table', () => {
    render(<StatisticsTab />);
    expect(screen.getByRole('link', { name: /Genome Decoration Page/ })).toHaveAttribute(
      'href',
      'https://ftp.ncbi.nlm.nih.gov/pub/gdp/'
    );
    expect(screen.getByRole('link', { name: /merge_hrc_topmed_stats.json/ })).toHaveAttribute(
      'href',
      'https://github.com/USCbiostats/annoq-site-v2/blob/main/metadata/merge_hrc_topmed_stats.json'
    );
  });

  it('labels the percentage as HRC measured against TopMed', () => {
    render(<StatisticsTab />);
    // Guards the column meaning: hrcVsTopmedPct is HRC's share of TopMed,
    // not the HRC mapping success rate.
    expect(screen.getByText('% of HRC compared to TopMed')).toBeInTheDocument();
    const first = screen.getAllByRole('row')[1];
    expect(within(first).getByText('5.3318%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/data/StatisticsTab.test.tsx`
Expected: FAIL — `Failed to resolve import "./StatisticsTab"`.

- [ ] **Step 3: Write the component**

Create `src/pages/data/StatisticsTab.tsx`:

```tsx
import { Box, Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { chromosomeStats } from '../../data/chromosomeStats';

const NCBI_GDP_URL = 'https://ftp.ncbi.nlm.nih.gov/pub/gdp/';
const STATS_FILE_URL =
  'https://github.com/USCbiostats/annoq-site-v2/blob/main/metadata/merge_hrc_topmed_stats.json';

const count = new Intl.NumberFormat('en-US');

export function StatisticsTab() {
  return (
    <Box className="data-tab-body">
      <Typography className="data-prose" gutterBottom>
        Variant counts per chromosome, comparing the TopMed release with the Haplotype Reference
        Consortium (HRC) data on hg19 and the portion of it mapped into TopMed.
      </Typography>
      <Box className="data-statistics-scroll">
        <Table className="annoq-table data-statistics-table">
          <TableHead>
            <TableRow>
              <TableCell>Chromosome</TableCell>
              <TableCell align="right"># of base pairs</TableCell>
              <TableCell align="right"># of entries in TopMed</TableCell>
              <TableCell align="right"># of entries in HG19</TableCell>
              <TableCell align="right">Mapped in HRC #</TableCell>
              <TableCell align="right">% of HRC compared to TopMed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chromosomeStats.map((row) => (
              <TableRow key={row.chromosome}>
                <TableCell>
                  <Stack className="chromosome-cell" alignItems="center" spacing={0.5}>
                    <img
                      src={row.ideogram}
                      alt={`Chromosome ${row.chromosome} ideogram`}
                      loading="lazy"
                    />
                    <span>{row.chromosome}</span>
                  </Stack>
                </TableCell>
                <TableCell align="right">{count.format(row.basePairs)}</TableCell>
                <TableCell align="right">{count.format(row.topmedEntries)}</TableCell>
                <TableCell align="right">{count.format(row.hg19Entries)}</TableCell>
                <TableCell align="right">{count.format(row.mappedInHrc)}</TableCell>
                <TableCell align="right">{`${row.hrcVsTopmedPct}%`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Stack className="data-sources" spacing={0.5}>
        <Typography variant="body2">
          Chromosome ideograms and base-pair lengths: NCBI{' '}
          <Link href={NCBI_GDP_URL} target="_blank" rel="noreferrer">Genome Decoration Page</Link>,
          GRCh38, 850-band resolution.
        </Typography>
        <Typography variant="body2">
          Entry counts and HRC mapping:{' '}
          <Link href={STATS_FILE_URL} target="_blank" rel="noreferrer">merge_hrc_topmed_stats.json</Link>.
        </Typography>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/data/StatisticsTab.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Add the styles**

Append to `src/styles.css`:

```css
.data-tab-body {
  padding: 16px;
  background: #fff;
}

.data-prose {
  max-width: 72ch;
  color: #33465f;
}

.data-statistics-scroll {
  overflow-x: auto;
}

.data-statistics-table th,
.data-statistics-table td {
  white-space: nowrap;
}

.chromosome-cell img {
  display: block;
  height: auto;
}

.chromosome-cell span {
  font-weight: 700;
  color: #183153;
}

.data-sources {
  padding: 12px 4px 4px;
  color: #4a5a72;
}
```

- [ ] **Step 6: Verify types and full suite**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/data/StatisticsTab.tsx src/pages/data/StatisticsTab.test.tsx src/styles.css
git commit -F - <<'MSG'
For #22

Add the chromosome statistics table.

One row per chromosome with its ideogram, GRCh38 length, TopMed and HG19
entry counts, and the HRC mapped count. The percentage column is HRC's
share of TopMed, which is what the source file reports; the header says
so, since it is easily confused with the mapping success rate.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 4: DataAccess and Data Versions tabs

**Files:**
- Create: `src/pages/data/DataAccessTab.tsx`
- Create: `src/pages/data/DataVersionsTab.tsx`
- Create: `src/pages/data/DataVersionsTab.test.tsx`
- Create: `src/pages/data/DataAccessTab.test.tsx`

**Interfaces:**
- Consumes: `AnnotationVersionTable` from `src/features/annotations/AnnotationVersionTable` (Task 1); `useAnnotations` from `src/features/annotations/useAnnotations`.
- Produces: `DataAccessTab()` and `DataVersionsTab()` — neither takes props. Both rendered by Task 5's `DataPage`.

- [ ] **Step 1: Write the failing tests**

Create `src/pages/data/DataAccessTab.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DataAccessTab } from './DataAccessTab';

describe('DataAccessTab', () => {
  it('links to the services documentation', () => {
    render(<MemoryRouter><DataAccessTab /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/docs/services');
  });
});
```

Create `src/pages/data/DataVersionsTab.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DataVersionsTab } from './DataVersionsTab';

// vi.mock is hoisted above the import, so the static import above already
// resolves against the stub -- same shape as VersionPage.test.tsx.
vi.mock('../../features/annotations/useAnnotations', async () => {
  const { buildAnnotationStore } = await vi.importActual<typeof import('../../lib/annotations')>(
    '../../lib/annotations'
  );
  const store = buildAnnotationStore([
    { id: '1', name: 'ANNOVAR', leaf: false, version: 'v1' },
    { id: '2', name: 'ANNOVAR gene', parent_id: '1', leaf: true, version: 'v1a' }
  ]);
  return { useAnnotations: () => ({ data: store, isLoading: false, error: null }) };
});

function renderTab() {
  render(<MemoryRouter><DataVersionsTab /></MemoryRouter>);
}

describe('DataVersionsTab', () => {
  it('points HRC users at the archive site', () => {
    renderTab();
    expect(screen.getByRole('link', { name: 'archive.annoq.org' })).toHaveAttribute(
      'href',
      'http://archive.annoq.org/'
    );
  });

  it('links the mapping detail to the statistics tab', () => {
    renderTab();
    expect(screen.getByRole('link', { name: 'Data Statistics' })).toHaveAttribute(
      'href',
      '/data/statistics'
    );
  });

  it('says not all HRC data was mapped', () => {
    renderTab();
    expect(screen.getByText(/not all of the HRC data was mapped to TopMed/i)).toBeInTheDocument();
  });

  it('renders the annotation version table moved off Supported Annotations', () => {
    renderTab();
    expect(screen.getByText('SNP Detail/Annotation Tool')).toBeInTheDocument();
    expect(screen.getByText('ANNOVAR gene')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/data/DataAccessTab.test.tsx src/pages/data/DataVersionsTab.test.tsx`
Expected: FAIL — both modules unresolved.

- [ ] **Step 3: Write `DataAccessTab`**

Create `src/pages/data/DataAccessTab.tsx`:

```tsx
import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function DataAccessTab() {
  return (
    <Box className="data-tab-body">
      <Typography className="data-prose">
        AnnoQ data can be accessed programmatically via{' '}
        <Link component={RouterLink} to="/docs/services">Services</Link>.
      </Typography>
    </Box>
  );
}
```

- [ ] **Step 4: Write `DataVersionsTab`**

Create `src/pages/data/DataVersionsTab.tsx`:

```tsx
import { Box, CircularProgress, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AnnotationVersionTable } from '../../features/annotations/AnnotationVersionTable';
import { useAnnotations } from '../../features/annotations/useAnnotations';

const ARCHIVE_URL = 'http://archive.annoq.org/';

export function DataVersionsTab() {
  const annotations = useAnnotations();

  return (
    <Box className="data-tab-body">
      <Typography className="data-prose" gutterBottom>
        Previous versions of AnnoQ were based on variants from the Haplotype Reference Consortium
        (HRC). The last version with HRC variants can be accessed via{' '}
        <Link href={ARCHIVE_URL} target="_blank" rel="noreferrer">archive.annoq.org</Link>. To
        support users who want to continue using HRC and access TopMed's richer annotations,
        functionality has been added to search for HRC data. Note, not all of the HRC data was
        mapped to TopMed.{' '}
        <Link component={RouterLink} to="/data/statistics">Data Statistics</Link> has detailed HRC
        mapping information, and the annotations under the &ldquo;HG19 Info&rdquo; category have
        more details.
      </Typography>
      <Box className="data-version-table">
        {annotations.isLoading ? (
          <CircularProgress />
        ) : (
          <AnnotationVersionTable tree={annotations.data?.tree ?? []} />
        )}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 5: Add the table scroll style**

Append to `src/styles.css`:

```css
.data-version-table {
  max-height: 72vh;
  overflow: auto;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/pages/data/DataAccessTab.test.tsx src/pages/data/DataVersionsTab.test.tsx`
Expected: PASS, 5 tests total.

- [ ] **Step 7: Verify types and full suite**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/data/DataAccessTab.tsx src/pages/data/DataAccessTab.test.tsx \
        src/pages/data/DataVersionsTab.tsx src/pages/data/DataVersionsTab.test.tsx \
        src/styles.css
git commit -F - <<'MSG'
For #22

Add the DataAccess and Data Versions tab bodies.

Data Versions carries the HRC history and the note that the mapping into
TopMed is partial, linking to the statistics tab for the per-chromosome
detail, and hosts the annotation version table.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 5: The Data page shell

**Files:**
- Create: `src/pages/DataPage.tsx`
- Create: `src/pages/DataPage.test.tsx`

**Interfaces:**
- Consumes: `DataAccessTab` (Task 4), `DataVersionsTab` (Task 4), `StatisticsTab` (Task 3).
- Produces: `DataPage()` — reads the `:tab` route param. Mounted by Task 6 at `/data/:tab`.

- [ ] **Step 1: Write the failing test**

Create `src/pages/DataPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DataPage } from './DataPage';

// The tab bodies have their own tests; the shell is what is under test here.
vi.mock('./data/DataAccessTab', () => ({ DataAccessTab: () => <div>access body</div> }));
vi.mock('./data/DataVersionsTab', () => ({ DataVersionsTab: () => <div>versions body</div> }));
vi.mock('./data/StatisticsTab', () => ({ StatisticsTab: () => <div>statistics body</div> }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/data/:tab" element={<DataPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DataPage', () => {
  it('offers the three tabs from the issue', () => {
    renderAt('/data/access');
    expect(screen.getByRole('tab', { name: 'Data Access' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Data Versions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Statistics' })).toBeInTheDocument();
  });

  it('renders the body named by the route param', () => {
    renderAt('/data/statistics');
    expect(screen.getByText('statistics body')).toBeInTheDocument();
    expect(screen.queryByText('access body')).toBeNull();
  });

  it('marks the routed tab as selected', () => {
    renderAt('/data/versions');
    expect(screen.getByRole('tab', { name: 'Data Versions' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('falls back to the access tab for an unknown segment', () => {
    renderAt('/data/nonsense');
    expect(screen.getByText('access body')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Data Access' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/DataPage.test.tsx`
Expected: FAIL — `Failed to resolve import "./DataPage"`.

- [ ] **Step 3: Write the shell**

Create `src/pages/DataPage.tsx`:

```tsx
import { Box, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { DataAccessTab } from './data/DataAccessTab';
import { DataVersionsTab } from './data/DataVersionsTab';
import { StatisticsTab } from './data/StatisticsTab';

const TABS = [
  { value: 'access', label: 'Data Access', render: () => <DataAccessTab /> },
  { value: 'versions', label: 'Data Versions', render: () => <DataVersionsTab /> },
  { value: 'statistics', label: 'Statistics', render: () => <StatisticsTab /> }
];

export function DataPage() {
  const { tab } = useParams();
  const navigate = useNavigate();

  // An unknown segment renders the default tab rather than 404ing, so a stale
  // or hand-typed URL still lands somewhere useful.
  const active = TABS.find((entry) => entry.value === tab) ?? TABS[0];

  return (
    <Container className="simple-page">
      <Typography variant="h3" gutterBottom>Data</Typography>
      <Paper className="supported-shell">
        <Box className="supported-tabs-wrap">
          <Tabs
            value={active.value}
            onChange={(_, value: string) => navigate(`/data/${value}`)}
            className="supported-tabs"
          >
            {TABS.map((entry) => (
              <Tab key={entry.value} value={entry.value} label={entry.label} />
            ))}
          </Tabs>
        </Box>
        {active.render()}
      </Paper>
    </Container>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/DataPage.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Verify types and full suite**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/DataPage.tsx src/pages/DataPage.test.tsx
git commit -F - <<'MSG'
For #22

Add the Data page tab shell.

Tab selection comes from the route segment rather than component state,
so the Data Versions prose can link straight at the statistics tab and
the three tabs are bookmarkable.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 6: Wire the navigation

**Files:**
- Modify: `src/App.tsx` (nav array lines 20-26; beta button line 64; routes block lines 76-88; imports lines 1-18)
- Modify: `src/App.test.tsx` (the `TopMed beta label` describe block, lines 36-44)

**Interfaces:**
- Consumes: `DataPage` from `src/pages/DataPage` (Task 5).

- [ ] **Step 1: Rewrite the failing tests**

In `src/App.test.tsx`, replace the entire `TopMed beta label` describe block (lines 36-44, including its two-line comment above it) with:

```tsx
// annoq-site-v2#22 retires the beta button and folds data access into a Data
// menu item. /version itself stays -- the release notes still link to it.
describe('primary navigation', () => {
  it('no longer shows the TopMed beta release button', () => {
    renderAt('/');
    expect(screen.queryByRole('link', { name: 'TopMed Beta Release' })).toBeNull();
  });

  it('exposes a Data nav item', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Data' })).toHaveAttribute('href', '/data');
  });

  it('drops the old Data Access nav item', () => {
    renderAt('/');
    expect(screen.queryByRole('link', { name: 'Data Access' })).toBeNull();
  });

  it('redirects /data to the access tab', () => {
    renderAt('/data');
    expect(screen.getByRole('tab', { name: 'Data Access' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
```

The file already imports `screen` from `@testing-library/react`; no import change is needed.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — the beta-label link is still found, and there is no `Data` link.

- [ ] **Step 3: Update the nav array**

In `src/App.tsx`, change the `nav` array entry:

```tsx
const nav = [
  { label: 'News', to: '/release' },
  { label: 'Supported Annotations', to: '/detail' },
  { label: 'Data', to: '/data' },
  { label: 'About', to: '/about' },
  { label: 'Help/Tutorial', to: '/docs' }
];
```

- [ ] **Step 4: Remove the beta button**

Delete this line from the toolbar (line 64):

```tsx
<Button component={RouterLink} to="/version" className="beta-label">TopMed Beta Release</Button>
```

Leave the `.beta-label` rule in `src/styles.css` alone — it is dead but harmless, and removing CSS is not part of this issue.

- [ ] **Step 5: Add the routes**

Add to the `<Routes>` block, after the `/detail` route:

```tsx
<Route path="/data" element={<Navigate to="/data/access" replace />} />
<Route path="/data/:tab" element={<DataPage />} />
```

Update the two imports at the top of the file:

```tsx
import { Link as RouterLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
```

```tsx
import { DataPage } from './pages/DataPage';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS, 6 tests (two pre-existing viewport-lock cases plus the four new ones).

The `/data` case renders the real `DataAccessTab`, which needs no query client. If a later change ever makes `/data` default to a tab that calls `useAnnotations`, that test will need a `QueryClientProvider` wrapper.

- [ ] **Step 7: Verify types and full suite**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -F - <<'MSG'
For #22

Rename the Data Access nav item to Data and drop the beta button.

Data now opens the new tabbed page instead of jumping into the docs
tree. /data redirects to the access tab. The /version route stays
reachable; only the toolbar button goes.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 7: Remove the Data Versions tab from Supported Annotations

**Files:**
- Modify: `src/pages/SupportedAnnotationsPage.tsx`
- Modify: `src/pages/SupportedAnnotationsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `src/pages/SupportedAnnotationsPage.test.tsx`:

```tsx
// annoq-site-v2#22 moved this table to Data > Data Versions; the page is back
// to being just the annotation tree.
describe('SupportedAnnotationsPage tabs', () => {
  it('no longer offers a Data Versions tab', () => {
    renderPage();
    expect(screen.queryByRole('tab', { name: 'Data Versions' })).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('still shows the annotation tree controls', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Upload Config' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/SupportedAnnotationsPage.test.tsx`
Expected: FAIL — the `Data Versions` tab is still rendered.

- [ ] **Step 3: Strip the tabs**

In `src/pages/SupportedAnnotationsPage.tsx`:

- Delete the `const [tab, setTab] = useState('annotations');` line.
- Delete the `<Box className="supported-tabs-wrap">…</Box>` block containing `<Tabs>` and both `<Tab>` elements.
- Replace the `{tab === 'annotations' ? (…) : (…)}` conditional with just its first branch, so the `Paper` body is the actions `Stack` followed by the tree `Box`.
- Remove the now-unused imports: `Tab`, `Tabs`, and `AnnotationVersionTable`.

The resulting `Paper` body reads:

```tsx
<Paper className="supported-shell">
  <Stack direction="row" spacing={1} className="supported-actions">
    <Button variant="outlined" onClick={() => {
      trackEvent('clear_selection', { page_path: '/detail' });
      setSelected([]);
    }}>Clear Selection</Button>
    <Button variant="outlined" onClick={() => input.current?.click()}>Upload Config</Button>
    <input ref={input} hidden type="file" onChange={(event) => void uploadConfig(event.target.files?.[0])} />
    <Button variant="contained" onClick={() => {
      trackEvent('export_config', { page_path: '/detail' });
      downloadText('config.txt', JSON.stringify({ _source: selected }));
    }}>Export Config</Button>
  </Stack>
  <Box className="supported-tree">
    <AnnotationTree store={store} selected={selected} onSelectedChange={setSelected} showDescriptions />
  </Box>
</Paper>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/SupportedAnnotationsPage.test.tsx`
Expected: PASS — the two new cases plus the two pre-existing analytics cases.

- [ ] **Step 5: Verify types and full suite**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SupportedAnnotationsPage.tsx src/pages/SupportedAnnotationsPage.test.tsx
git commit -F - <<'MSG'
For #22

Move the Data Versions table off Supported Annotations.

It now lives under Data > Data Versions. With one tab left the tab strip
was carrying nothing, so the page renders the annotation tree directly
again.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 8: Update the documentation

**Files:**
- Modify: `docs/routes-and-pages.md`
- Modify: `docs/directory-and-code-map.md`

- [ ] **Step 1: Add the new routes to the route table**

In `docs/routes-and-pages.md`, insert into the route table after the `/detail` row:

```markdown
| `/data` | Redirect | Sends to `/data/access`. |
| `/data/:tab` | `DataPage` | Data area: `access`, `versions`, `statistics`. Unknown segments fall back to `access`. |
```

Change the `/detail` row's purpose to drop the versions mention:

```markdown
| `/detail` | `SupportedAnnotationsPage` | Supported annotation tree, config import/export. |
```

- [ ] **Step 2: Add a Data Page section**

In `docs/routes-and-pages.md`, add after the "Supported Annotations Page" section:

```markdown
## Data Page

The data route is:

```text
/data/:tab
```

Component:

```text
src/pages/DataPage.tsx
```

`DataPage` is a tab shell only. The active tab comes from the `:tab` route segment, not component
state, so the three tabs are linkable and bookmarkable — the Data Versions copy links directly to
`/data/statistics`. Each tab body lives in its own file:

```text
src/pages/data/DataAccessTab.tsx    Programmatic access, links to /docs/services
src/pages/data/DataVersionsTab.tsx  HRC history plus the annotation version table
src/pages/data/StatisticsTab.tsx    Per-chromosome TopMed and HRC counts
```

The statistics table reads `src/data/chromosomeStats.ts`, which is **generated**. Both it and the
ideogram SVGs under `public/assets/images/chromosomes/` come from
`scripts/generate-chromosome-data.mjs`; regenerate with `npm run generate:chromosome-data` rather
than editing either by hand.

The annotation version table is shared with `/version`:

```text
src/features/annotations/AnnotationVersionTable.tsx
```
```

- [ ] **Step 3: Update the Supported Annotations section**

In the same file, remove `- Data versions table.` from the Supported Annotations Page bullet list.

- [ ] **Step 4: Update the code map**

In `docs/directory-and-code-map.md`, find the section listing `src/pages` and `scripts`, and add entries matching the file's existing style for:

- `src/pages/DataPage.tsx` — Data area tab shell.
- `src/pages/data/` — the three tab bodies.
- `src/features/annotations/AnnotationVersionTable.tsx` — shared version table.
- `src/data/chromosomeStats.ts` — generated chromosome statistics.
- `scripts/generate-chromosome-data.mjs` — generator for the two artifacts above.

Read the file first and match its existing table or list formatting rather than imposing a new one.

- [ ] **Step 5: Verify nothing else references the moved table**

```bash
grep -rn "Data Access" docs src --include=*.md --include=*.tsx --include=*.ts | grep -v node_modules
grep -rn "beta-label" src docs
```

Expected: the only `Data Access` hits are the new tab label and the docs describing it. `beta-label` should appear only in `src/styles.css`.

- [ ] **Step 6: Commit**

```bash
git add docs/routes-and-pages.md docs/directory-and-code-map.md
git commit -F - <<'MSG'
For #22

Document the Data page and the generated chromosome data.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 9: Verify the built site

Automated tests do not render SVGs or catch a table that is unreadable at width. This task is a real browser check.

- [ ] **Step 1: Type-check, test and build**

Run: `npx tsc -b && npm test && npm run build`
Expected: all pass; the build emits `dist/` with the 23 chromosome SVGs under `dist/assets/images/chromosomes/`.

Confirm the assets survived the build:

```bash
ls dist/assets/images/chromosomes | wc -l
```
Expected: `23`

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`

- [ ] **Step 3: Walk the pages**

Check each, at desktop width and again narrowed to roughly 500px:

1. `/` — the toolbar shows **Launch Query UI** and **UI Tutorial** and no **TopMed Beta Release** button; the nav reads News, Supported Annotations, **Data**, About, Help/Tutorial.
2. `/data` — redirects to `/data/access` and shows the Services link.
3. `/data/versions` — the HRC paragraph renders, `archive.annoq.org` opens the archive, **Data Statistics** navigates to the statistics tab, and the version table lists tools.
4. `/data/statistics` — **23 rows**, each with a visible banded ideogram above its chromosome number. chr1 is tall, chr21 is short, and the centromere shows as a red pinch. Numbers carry thousands separators. The table scrolls horizontally when narrow instead of overflowing the page.
5. `/detail` — no tab strip, annotation tree and its three buttons work.
6. `/version` — still renders the version table with the WGSA credit.

- [ ] **Step 4: Fix anything the walkthrough surfaces, then commit**

If the ideograms need visual adjustment, change `STAIN_FILL`, `SVG_WIDTH` or `MAX_HEIGHT` in the generator and re-run `npm run generate:chromosome-data` — never hand-edit an SVG.

```bash
git add -A
git commit -F - <<'MSG'
For #22

Adjustments from the browser walkthrough.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

Skip this commit if the walkthrough found nothing.

---

## Spec coverage

| Spec requirement | Task |
| --- | --- |
| Remove `TopMed Beta Release` toolbar button | 6 |
| Keep `/version` route and page | 1 (rewired), 6 (untouched), 9 (verified) |
| Nav `Data Access` → `Data` | 6 |
| `/data` → `/data/access` redirect; `/data/:tab` | 6 |
| Unknown tab falls back to access | 5 |
| `DataPage` shell + three tab files | 5 |
| DataAccess tab links `/docs/services` | 4 |
| Data Versions tab: HRC narrative, archive link, statistics link, HG19 Info mention | 4 |
| Data Versions tab hosts the moved version table | 4 |
| `AnnotationVersionTable` extraction, both consumers | 1 |
| Supported Annotations loses the tab and the table | 7 |
| Vendored NCBI ideogram file, GRCh38 verified | 2 |
| Generator emits SVGs + `chromosomeStats.ts` | 2 |
| npm script, generated-file header | 2 |
| Statistics table, six columns, 1–22 then X | 3 |
| Percentage is HRC's share of TopMed, labelled as such | 2 (test), 3 (header) |
| Source links below the table | 3 |
| Reuse `annoq-table` / `supported-*` classes | 3, 5 |
| Docs updated | 8 |
