# Search Query UI

The Search page is the most important interactive part of the site.

## Main Files

```text
src/features/search/
  SearchWorkspace.tsx
  searchState.tsx
  QueryDrawer.tsx
  ResultsTable.tsx
  SummaryPanel.tsx
  StatsPanel.tsx
  FilterPanel.tsx
  DetailPanel.tsx
```

## Layout

`SearchWorkspace.tsx` renders:

- Left query drawer:
  `QueryDrawer`

- Center work area:
  Table, summary, or stats tab.

- Right drawer:
  Detail, summary, stats, or filters panel.

The left query drawer can be opened/closed. On mobile it is temporary; on desktop it is persistent.

## Query Modes

Supported query modes are typed in `src/types.ts`:

```ts
export type QueryMode =
  | 'chromosome'
  | 'vcf'
  | 'geneProduct'
  | 'rsID'
  | 'rsIDList';
```

The form UI for these modes is in:

```text
src/features/search/QueryDrawer.tsx
```

Mode-specific inputs:

- Chromosome: chromosome, start, end.
- VCF: pasted/uploaded VCF rows.
- Gene Product: gene product ID.
- rsID: one rsID.
- rsID List: pasted/uploaded rsID list.
- Keyword: hidden by default behind `ENABLE_KEYWORD_SEARCH`.

Samples are in:

```text
src/data/samples.ts
```

Keyword search is implemented in the frontend and query builder but intentionally disabled in `src/lib/config.ts`. Flip `ENABLE_KEYWORD_SEARCH` to `true` to show it in the query type menu.

## Submit Flow

1. User chooses a query mode and enters values.
2. User selects annotations.
3. `QueryDrawer.submit()` calls `submitSearch`.
4. `submitSearch` calls `buildRequest` in `src/lib/queryBuilder.ts`.
5. Search reducer receives `submit`.
6. `SearchWorkspace` detects `state.submitted` and fetches a result page.
7. The old request is aborted if still running.
8. Results are normalized and stored through `pageSuccess`.
9. Aggregate counts are fetched and merged through `pageAggsSuccess`.

## Search State

The reducer lives in:

```text
src/features/search/searchState.tsx
```

Important fields:

- `mode`
- `values`
- `filters`
- `submitted`
- `requestId`
- `page`
- `result`
- `loading`
- `error`
- `selectedRow`
- `statsField`
- `stats`
- `panel`
- `sidePanel`

`requestId` prevents late backend responses from older searches overwriting newer searches.

## Results Table

Main file:

```text
src/features/search/ResultsTable.tsx
```

Responsibilities:

- Render current result page.
- Render column headers and counts.
- Open column stats drawer.
- Add filters from column counts/filter buttons.
- Pin/unpin columns.
- Select a row to open details.
- Paginate server results.
- Download results.

Default pinned columns are defined in `ResultsTable.tsx`.

The backend returns paginated data. The default page size is from:

```text
src/lib/config.ts
```

## Filters

Filters currently mean “only return variants where these annotation fields have values.”

Filter UI exists in:

- Header filter chips in `ResultsTable.tsx`.
- Right drawer `FilterPanel.tsx`.
- Filter buttons in `SummaryPanel.tsx`.

Filter state lives in the reducer as `filters: string[]`.

Changing filters submits a new request with the same query values and selected fields.

## Summary

Main file:

```text
src/features/search/SummaryPanel.tsx
```

Shows:

- Position range.
- Selected columns.
- “With values” counts.
- Actions to filter or open stats.

Position range comes from aggregate data for `pos`.

## Stats

Main file:

```text
src/features/search/StatsPanel.tsx
```

Shows:

- Availability pie chart.
- Top values bar chart.
- Position histogram.

Charts use Recharts.

Stats are fetched in `SearchWorkspace.tsx` using `buildStatsQuery`. The selected stats field lives in `state.statsField`. If no field is selected yet, the first result column is used.

Changing the dropdown inside the Stats tab only changes the selected stats field. It does not open the right side drawer.

Opening stats from the table or summary explicitly opens the right side drawer.

## Detail Drawer

Main file:

```text
src/features/search/DetailPanel.tsx
```

Selecting a result row stores it as `state.selectedRow` and opens the right drawer.

Detail rendering uses the same cell formatter as the table where practical.

## Download

Download button lives in:

```text
src/features/search/ResultsTable.tsx
```

Download query is built by:

```text
src/lib/queryBuilder.ts
```

The backend returns a path. The frontend opens:

```text
{API_BASE}/download{returnedPath}
```

The `fields` argument must be sent as a GraphQL list, not as a quoted string.
