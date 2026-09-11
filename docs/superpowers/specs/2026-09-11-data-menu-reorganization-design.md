# Data menu reorganization — design

**Date:** 2026-09-11
**Owning issue:** [USCbiostats/annoq-site-v2#22](https://github.com/USCbiostats/annoq-site-v2/issues/22)
**Branch:** `annoq-site-78-add-hrc-mapping-info` (this repo, annoq-site-v2)

---

## What this is

Issue #22 reorganizes the site's top-level navigation around a new **Data** menu item and adds the
content that belongs under it. Today "Data Access" is a nav label that jumps straight into the docs
tree at `/docs/services`, and the data-versions table lives on the Supported Annotations page where
nothing else about it belongs. This change gives data its own page with three tabs, and adds a
per-chromosome statistics table that did not exist before.

The statistics table is the substantive new work. Everything else is a move or a deletion.

---

## Decisions taken before implementation

The issue leaves four things open. These were resolved with the issue author before any code was
written; they are recorded here because the issue text does not settle them.

1. **Chromosome images.** The issue notes these are not available in the codebase. They are
   **generated in-repo as banded SVG ideograms** from NCBI's public-domain ideogram table and
   committed, rather than hotlinked from an external host or omitted.
2. **Where the moved Data Versions table lands.** The issue contradicts itself: the body places it
   under the *Data Versions* bullet, the closing line says the *Data Access* tab. It goes in the
   **Data Versions tab** — that matches the tab's name and the detailed body text; the closing line
   reads as shorthand for "the Data area".
3. **Tab addressing.** Tabs are **sub-routes** (`/data/access`, `/data/versions`, `/data/statistics`),
   not React state. The issue requires the Data Versions prose to link to the Statistics tab, and a
   sub-route makes that a real link with working back/forward and bookmarks.
4. **The `/version` page.** The issue only asks to remove the toolbar button. The **route and page
   stay** — the News release notes and external annoq.org content link to `/version`, and removing
   it would break those.

---

## Scope

### In scope

- Remove the `TopMed Beta Release` toolbar button.
- Rename nav `Data Access` → `Data`, repointed at the new page.
- New `/data` page with `DataAccess`, `Data Versions` and `Statistics` tabs.
- Move the data-versions table off Supported Annotations into the Data Versions tab.
- New per-chromosome statistics table with ideograms and source attribution.

### Out of scope

- The `/docs/services` content itself. The DataAccess tab links to it; it is not moved or rewritten.
- Any change to search, the annotation tree, or the api-v2 contract.
- Refactoring beyond the one extraction named in "Shared version table" below.

---

## Navigation and routing

`src/App.tsx`:

- Delete the `beta-label` button from the toolbar. `/version` and `VersionPage` are untouched.
- Nav entry `{ label: 'Data Access', to: '/docs/services' }` becomes `{ label: 'Data', to: '/data' }`.
- Routes added:

  | Route | Behaviour |
  | --- | --- |
  | `/data` | Redirects to `/data/access` |
  | `/data/:tab` | `DataPage`; unknown `:tab` falls back to the access tab |

The fallback is a redirect to `/data/access` rather than a 404, so a stale or hand-typed tab segment
lands somewhere useful.

---

## Page structure

One thin shell plus three tab bodies, each in its own file, so no single file carries all three tabs:

```text
src/pages/DataPage.tsx              tabs shell; reads :tab, navigates on change
src/pages/data/DataAccessTab.tsx    programmatic-access blurb + link to /docs/services
src/pages/data/DataVersionsTab.tsx  HRC narrative + the moved version table
src/pages/data/StatisticsTab.tsx    chromosome statistics table
```

`DataPage` owns tab selection and URL syncing only. Each tab body is independently renderable and
testable, and knows nothing about the others.

Tabs reuse the existing `supported-tabs` / `supported-tabs-wrap` markup and CSS from
`SupportedAnnotationsPage` so the new page matches the established look without new styling.

### Tab content

**DataAccess.** Short prose stating AnnoQ data can be accessed programmatically via Services, linking
to `/docs/services`. The issue writes the tab as "DataAccess"; the visible label is **Data Access**,
matching the nav label this page replaces. The route segment is `access`.

**Data Versions.** The HRC narrative from the issue, verbatim in substance: previous versions were
HRC-based, the last HRC version is at [archive.annoq.org](http://archive.annoq.org/), HRC search was
added so users can reach TopMed's richer annotations, not all HRC data was mapped, and the Statistics
tab plus the "HG19 info" annotation category carry the detail. The link to the statistics detail is a
router link to `/data/statistics`. Below the prose, the annotation version table moved off Supported
Annotations.

**Statistics.** The chromosome table described below.

### Shared version table

The annotation version table currently exists twice: in `SupportedAnnotationsPage.tsx` (the tab being
removed) and as `VersionContent` in `StaticPages.tsx` (the `/version` page). Since one copy is moving
anyway, the rendering is extracted once to:

```text
src/features/annotations/AnnotationVersionTable.tsx
```

consumed by both `DataVersionsTab` and `VersionPage`. Both copies already derive rows by walking the
annotation tree rather than the flat response order — that ordering behaviour is preserved in the
extracted component, since it was a deliberate fix in both places.

This is the only refactoring in this change.

---

## Supported Annotations page

With the Data Versions tab removed, one tab remains, so the `<Tabs>` wrapper and the `tab` state go
too. The page renders the annotation tree, its action buttons and the upload/export controls directly,
as it did before tabs were introduced. Selection, config upload/export and their analytics events are
unchanged.

---

## Statistics data and ideograms

### Source

One authoritative, public-domain source supplies both the ideogram banding and the base-pair column:
NCBI's Genome Decoration Page ideogram table, 850-band, GRCh38:

```text
metadata/ideogram_9606_GCF_000001305.16_850_V1.txt
```

Vendored into the repo so the build never depends on a live fetch. Assembly verified before adoption:
chr1 max `bp_stop` = 248,956,422 and chrX = 156,040,895, both GRCh38 — not GRCh37's 249,250,621.

GRCh38 is the correct basis because the TopMed entries counted in this table are hg38.

The per-chromosome counts come from the file the issue names:

```text
metadata/merge_hrc_topmed_stats.json
```

### Generation

```text
scripts/generate-chromosome-data.mjs
```

reads both metadata files and emits two committed artifacts:

- `public/assets/images/chromosomes/chr{1..22,X}.svg` — vertical banded ideograms. Giemsa stain
  shading from the `stain`/`density` columns, a pinched centromere at the `acen` bands, and heights
  scaled proportionally across all 23 so chr21 visibly reads as short beside chr1.
- `src/data/chromosomeStats.ts` — typed rows consumed by `StatisticsTab`.

Exposed as an npm script and re-runnable. Outputs are committed rather than generated at build time:
`metadata/README.md` states that directory is not read by the app at runtime, and committing keeps
the app's runtime inputs inside `src/` and `public/`.

`src/data/chromosomeStats.ts` is generated. It carries a header comment saying so and naming the
script, so it is not hand-edited.

### Columns

Chromosomes are ordered 1–22 then X — numerically, not the JSON's lexicographic key order, which
interleaves 1, 10, 11 … 2, 20.

| Column | Source |
| --- | --- |
| Chromosome | ideogram SVG above the chromosome name |
| # of base pairs | max `bp_stop` for that chromosome in the NCBI table |
| # of entries in TopMed | `topmed_rows` |
| # of entries in HG19 | `hrc_snp_rows` |
| Mapped in HRC # | `mapped_Y` |
| % of HRC compared to TopMed | `hrc_vs_topmed_pct` |

Counts are rendered with thousands separators; the percentage keeps the source file's precision.

**Verified semantics:** `hrc_vs_topmed_pct == hrc_snp_rows / topmed_rows × 100` holds for all 23
rows. The percentage is therefore HRC's share of TopMed, **not** the HRC mapping success rate
(`mapped_Y / hrc_snp_rows`, which is ~97–99% throughout). The column is labelled accordingly so the
two are not confused.

### Attribution

Source links sit below the table, as the issue requires: NCBI's Genome Decoration Page for the
ideograms and assembly lengths, and `merge_hrc_topmed_stats.json` for the entry counts.

---

## Testing

Vitest + Testing Library, following the existing per-page test files.

- `App.test.tsx` — the existing `TopMed beta label` case asserts the button links to `/version`; it is
  replaced by a case asserting the button is gone. Add a case asserting the nav exposes `Data`
  pointing at `/data`.
- `DataPage` — renders the tab matching `:tab`; an unknown segment falls back to access.
- `DataVersionsTab` — renders version rows from the annotation store; links to `/data/statistics`.
- `StatisticsTab` — renders 23 rows in 1–22, X order; formats counts; renders source links.
- `SupportedAnnotationsPage.test.tsx` — existing analytics cases must still pass with the tabs gone;
  add a case asserting the versions tab is no longer present.
- The generator is covered through its committed output rather than by mocking the filesystem.

---

## Risks

- **Ideogram fidelity.** A generated SVG is an approximation of a published karyotype image. The band
  boundaries are exact because they come from NCBI's table; the visual treatment is ours. Acceptable
  for a table thumbnail, and honestly attributed.
- **Stats file drift.** `merge_hrc_topmed_stats.json` is a snapshot. If it is regenerated upstream,
  the committed `chromosomeStats.ts` must be regenerated too. The npm script makes that one command,
  and the generated-file header says so.
