# Common Change Guide

This guide answers “where do I change X?” for common tasks.

## Change Top Navigation

Edit:

```text
src/App.tsx
```

Look for:

```ts
const nav = [...]
```

Styling:

```text
src/styles.css
```

Relevant classes:

- `.main-appbar`
- `.main-toolbar`
- `.brand`
- `.launch-buttons`
- `.main-nav-link`

## Change Landing Page Content

Edit:

```text
src/pages/StaticPages.tsx
```

For release/news rows and browser compatibility rows, edit:

```text
src/data/staticContent.ts
```

For images, add files under:

```text
public/assets/images/
```

Then reference with:

```text
/assets/images/file-name.png
```

## Change About/Contact/Cookie Pages

Edit:

```text
src/pages/StaticPages.tsx
```

Components:

- `AboutPage`
- `ContactPage`
- `CookiePolicyPage`

## Add A News/Release Entry

Edit:

```text
src/data/staticContent.ts
```

Add an entry to `releases`.

Release item strings may include curated HTML links.

## Add Or Change Docs Pages

Markdown content:

```text
public/assets/docs/
```

Docs route/nav:

```text
src/pages/DocsPage.tsx
```

## Change Backend URL

Preferred local environment variable:

```text
VITE_ANNOQ_API_V2
```

Default config:

```text
src/lib/environment.ts
src/lib/config.ts
```

## Change Default Selected Annotations

Edit:

```text
src/lib/config.ts
```

Look for:

```ts
export const DEFAULT_SELECTED_ANNOTATION_IDS = [2, 3, 4, 5, 6];
```

These IDs are backend annotation IDs.

## Change Base Result Columns

Edit:

```text
src/lib/config.ts
src/lib/annotations.ts
```

Look for:

```ts
export const CORE_BASE_COLUMNS = ['chr', 'pos', 'ref', 'alt'];
```

These core columns are always requested in searches. The rsID column is added dynamically from `store.rsidField`, which is detected in `buildAnnotationStore`.

## Add A Query Mode

Files to update:

1. `src/types.ts`
   Add to `QueryMode` and form values if needed.

2. `src/features/search/QueryDrawer.tsx`
   Add mode option and form inputs.

3. `src/lib/queryBuilder.ts`
   Add GraphQL function names to `QUERY_FUNCTIONS` and add argument building in `buildArgs`.

4. Tests:
   Add query-builder tests in `src/lib/queryBuilder.test.ts`.

## Enable Keyword Search

Keyword search code exists but is hidden by default.

Edit:

```text
src/lib/config.ts
```

Change:

```ts
export const ENABLE_KEYWORD_SEARCH = false;
```

to:

```ts
export const ENABLE_KEYWORD_SEARCH = true;
```

The query mode, form field, and GraphQL function mapping are already present.

## Change Query Form Layout

Edit:

```text
src/features/search/QueryDrawer.tsx
```

Styling:

```text
src/styles.css
```

Relevant classes:

- `.query-drawer`
- `.query-drawer-title`
- `.query-provider-note`
- `.query-type-row`
- `.query-form-section`
- `.annotation-tree-wrap`

## Change Annotation Tree Behavior

Edit:

```text
src/features/annotations/AnnotationTree.tsx
```

Tree data helpers:

```text
src/lib/annotations.ts
```

## Change Result Table Columns Or Actions

Edit:

```text
src/features/search/ResultsTable.tsx
```

Common changes:

- Default pinned columns: `DEFAULT_PINNED_BY_MODE`.
- Header buttons: table header action area.
- Download behavior: `download()`.
- Filter chips: active filter bar.
- Pagination: bottom `Pagination`.

Styling:

```text
src/styles.css
```

Relevant classes:

- `.simple-results-table`
- `.table-head-cell`
- `.column-actions`
- `.pinned-column`
- `.active-filter-bar`

## Change Cell Formatting

Edit:

```text
src/lib/formatters.tsx
```

This handles:

- Scalar values.
- UCSC position links.
- Pipe-separated lists.
- Semicolon-separated term lists.
- PANTHER term/gene links.
- “View all” overflow handling.

PANTHER term lookup data:

```text
src/data/panther_terms.json
```

## Change Filters

Filter state:

```text
src/features/search/searchState.tsx
```

Filter UI:

```text
src/features/search/FilterPanel.tsx
src/features/search/ResultsTable.tsx
src/features/search/SummaryPanel.tsx
```

GraphQL filter args:

```text
src/lib/queryBuilder.ts
```

Look for:

```ts
buildFilterArgs
```

## Change Stats Charts

Edit:

```text
src/features/search/StatsPanel.tsx
```

Stats query:

```text
src/lib/queryBuilder.ts
```

Stats request effect:

```text
src/features/search/SearchWorkspace.tsx
```

## Change Summary Page

Edit:

```text
src/features/search/SummaryPanel.tsx
```

Position range values come from `result.posMin` and `result.posMax`, which are normalized from `pos` aggregates.

## Change Detail Drawer

Edit:

```text
src/features/search/DetailPanel.tsx
```

Row selection is triggered in:

```text
src/features/search/ResultsTable.tsx
```

Reducer action:

```text
selectRow
```

## Change Download Behavior

Edit:

```text
src/features/search/ResultsTable.tsx
src/lib/queryBuilder.ts
```

Important rule:

The GraphQL `fields` argument must be an array:

```graphql
fields: ["chr", "pos"]
```

not a string:

```graphql
fields: "[\"chr\", \"pos\"]"
```

The frontend then opens:

```text
{API_BASE}/download{returnedPath}
```
