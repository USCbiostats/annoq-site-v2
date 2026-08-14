# Locked Basic Columns — Design

Resolves [#4](https://github.com/USCbiostats/annoq-site-v2/issues/4): *"System pins some columns and
displays others although they are not selected"*

Branch: `issue-4-default-pinned-columns`
Date: 2026-08-14
Status: implemented. **Not yet verified in a browser** — no browser or Playwright is available in
this environment, so the greyed-out checkboxes and the pinning have not been confirmed by eye on
either stack. See "Verification".

> Reported: on a chromosome search with default parameters, selecting ANNOVAR while deselecting items
> from Basic leaves `chr` and `pos` fixed to the left, and `alt` and `rsid` still displayed although
> they are not selected.
>
> Requested changes:
> 1. When no prior selections exist, all "Basic" items should be selected by default.
> 2. `chr` and `pos` should always remain selected and disabled, to prevent deselection.

## What is actually wrong

The report contains three observations. One is already fixed, one is not a defect, and one is a real
bug whose cause is a single line.

### 1. "All Basic items selected by default" — already done

Shipped in `7727985` (issue #9). Verified against both live payloads on 2026-08-14: "Basic Info"
contains exactly five leaves on each stack, and `defaultSelectionForStore` seeds exactly those.

| Stack | Entries | Basic Info leaves |
| --- | --- | --- |
| HRC (`api-v2.annoq.org`) | 557 | `chr`, `pos`, `ref`, `alt`, `rs_dbSNP151` |
| TOPMed (`api-v2.topmed.annoq.org`) | 836 | `chr`, `pos`, `ref`, `alt`, `rs_dbSNP` |

No work is needed for requested change (1). It does, however, need a **regression test**, because the
fix below changes the guard that makes the seeding fire — see "The one regression risk".

### 2. "chr and pos fixed to the left" — not a defect

`DEFAULT_PINNED_BY_MODE` (`ResultsTable.tsx:31`) pins them deliberately, per query mode. It reads as
a glitch today only because those same columns appear *unticked* in the annotation tree — the user
sees the app pinning columns it claims not to have selected. Fixing the ticking removes the
surprise. The issue's requested-changes list does not ask for pinning to be removed, and removing it
would lose a feature, so `DEFAULT_PINNED_BY_MODE` is left alone.

### 3. "alt and rsid display although not selected" — the real bug

`buildRequest` force-fetches all five Basic Info columns on every search, regardless of the tree:

```ts
fields: unique([...(store ? baseColumnsForStore(store) : [...]), ...selectedAnnotations])
//                          ^ ['chr','pos','ref','alt',<rsid>]        queryBuilder.ts:80
```

`request.fields` becomes `result.columns` (`queryBuilder.ts:170`), which drives the rendered table.
So unticking `ref`, `alt`, or the RSID field has **never** done anything — the column is fetched and
rendered either way, and it is also written into every download via `buildDownloadQuery`.

Requested change (2) alone does not fix this. Locking `chr`/`pos` in the tree while leaving line 80
untouched would leave `alt` and `rsid` reappearing after being unticked — the precise behaviour the
issue was filed about. The forced set has to narrow from five columns to two.

### Why chr + pos are the correct mandatory pair

Not merely because the issue names them. `formatCell` renders every `pos` value as a UCSC genome
browser link assembled from the row's `chr`:

```ts
if (field === 'pos') {
  const chr = String(row.chr ?? '').replace(/^chr/i, '');   // formatters.tsx:28-29
  ...href={`${UCSC_URL}${chr}:${pos}-${pos}`}
```

Drop either column and that link silently degrades. `ref`, `alt`, and the RSID field carry no such
dependency — nothing in the app reads them except the table cell that displays them. The issue's
requested pair and the code's actual hard requirement coincide exactly.

## The fix

Make `chr` and `pos` a genuine invariant of the shared selection, and let everything else be exactly
what the user ticked.

### How — one invariant, enforced at one write point

Every mutation of the annotation selection funnels through `AnnotationSelectionProvider.setSelected`:
the tree, both "Clear Selection" buttons, both config-upload paths, and the #9 seeding effect.
Enforcing the invariant there means the tree, the GraphQL query, `localStorage`, and Export Config
cannot disagree — the query/selection divergence that produced this issue becomes structurally
impossible rather than being patched at each site.

```ts
// src/lib/config.ts — replaces the unused CORE_BASE_COLUMNS
export const LOCKED_ANNOTATION_NAMES = ['chr', 'pos'];

// src/features/annotations/AnnotationSelectionProvider.tsx
function withLocked(names: string[]): string[] {
  return [...LOCKED_ANNOTATION_NAMES, ...names.filter((n) => !LOCKED_ANNOTATION_NAMES.includes(n))];
}
```

Applied on every write **and** on `localStorage` hydration, so a selection stored before this change
is corrected on load rather than producing a tree that disagrees with the query for one session.

Locked names are placed **first**, unconditionally. Column order follows `request.fields`, so
normalising the order here keeps `chr`/`pos` as the leading columns without a second rule anywhere
else. `defaultSelectionForStore` already returns them in that order, so the default case is
unchanged.

With the invariant in place, the query builder's special case disappears entirely:

```ts
// src/lib/queryBuilder.ts
fields: unique(selectedAnnotations)
```

`buildRequest`'s `store` parameter becomes unused and is dropped, as is `submitSearch`'s — each has a
single call site (`SearchWorkspace.tsx:249`, `QueryDrawer.tsx:106`).

In `AnnotationTree`, a `lockedNames` prop defaulting to `LOCKED_ANNOTATION_NAMES` — so neither call
site can silently opt out of the invariant — drives three things:

- locked **leaves** render `disabled` and are ignored by the row's `onClick`;
- `toggleNode` computes `removable = leaves.filter((l) => !locked.has(l))` and deletes only those, so
  a parent toggle can never strip `chr`/`pos`;
- a node whose leaves are *all* locked is disabled outright.

`checked` / `indeterminate` continue to be computed over all leaves. Ticking "Basic Info" off
therefore removes `ref`/`alt`/`rsid`, leaves `chr`/`pos` on, and the parent settles on indeterminate
— an accurate rendering of the new state.

### The one regression risk

#9's seeding effect fires only when the selection is empty:

```ts
if (!store || defaultsInitialized.current || annotationSelection.selected.length > 0) return;
```

Once the provider always injects `chr`/`pos`, `selected.length > 0` is permanently true, the effect
never runs, and the Basic Info defaults silently stop appearing — reintroducing #9 while appearing to
fix #4. The guard must be rewritten in terms of the invariant:

```ts
const hasUserSelection = annotationSelection.selected.some((n) => !LOCKED_ANNOTATION_NAMES.includes(n));
if (!store || defaultsInitialized.current || hasUserSelection) return;
```

This also matches the issue's own wording — "when no prior selections exist" now means "nothing
beyond the mandatory columns". Existing behaviour is preserved: "Clear Selection" still clears for
the rest of the session (`defaultsInitialized` is already set for that mount), and the defaults
return on the next load.

### Consequence: the empty-selection warning becomes unreachable

`QueryDrawer.submit()` rejects an empty selection with *"Select at least one annotation from the
tree."* Under the invariant the selection can never be empty, so that branch is dead code and its
four tests assert against a state the app cannot reach.

Decision (confirmed with the issue owner): **remove it.** After "Clear Selection", Search runs and
returns a positions-only table — `chr` and `pos` for every variant in range, which is a legitimate
query. Making the failure impossible is a strictly better outcome than warning about it, and issue
#2's actual complaint (a warning that lingered after the problem was fixed) cannot recur if the
warning does not exist. The `configError` path in the same `warning` variable is unrelated and stays.

### Where

| # | File | Change |
| --- | --- | --- |
| 1 | `src/lib/config.ts` | `CORE_BASE_COLUMNS` (dead) → `LOCKED_ANNOTATION_NAMES = ['chr','pos']` |
| 2 | `src/features/annotations/AnnotationSelectionProvider.tsx` | `withLocked` on every write and on hydration |
| 3 | `src/features/annotations/AnnotationTree.tsx` | `lockedNames` prop; disabled locked leaves; locked-safe `toggleNode` |
| 4 | `src/lib/queryBuilder.ts` | `buildRequest` stops prepending base columns; drop unused `store` param |
| 5 | `src/lib/annotations.ts` | fold `baseColumnsForStore` into `defaultSelectionForStore`; delete the export |
| 6 | `src/features/search/SearchWorkspace.tsx` | seeding guard → "nothing beyond the locked pair"; drop `store` arg from `submitSearch` |
| 7 | `src/features/search/QueryDrawer.tsx` | remove the unreachable empty-selection warning and its state |
| 8 | `src/lib/queryBuilder.test.ts` | assert unticked columns are absent from `fields` |
| 9 | `src/features/annotations/AnnotationSelectionProvider.test.tsx` *(new)* | invariant on write, on hydration, and ordering |
| 10 | `src/features/annotations/AnnotationTree.test.tsx` *(new)* | locked leaves disabled; parent toggle preserves them |
| 11 | `src/features/search/SearchWorkspace.test.tsx` | seeding still fires against a locked-only selection; update the stored-selection assertion for the locked prefix |
| 12 | `src/features/search/QueryDrawer.test.tsx` | delete the four empty-selection tests |
| 13 | `docs/search-query-ui.md` | rewrite "Default Annotation Selection" (lines 70-94) |

On (5): after (4), `baseColumnsForStore` has no caller outside its own test, and keeping two
similarly named "base column" helpers is exactly the trap that produced this bug — one list meaning
*always sent*, another meaning *ticked by default*, with nothing in the names to tell them apart.
One exported concept per meaning: `LOCKED_ANNOTATION_NAMES` (mandatory) and
`defaultSelectionForStore` (initial tick state).

On (13): the current text states that `buildRequest` prepends the base columns and calls this
"keeping the checkboxes honest". That is no longer true and must not be left to mislead the next
reader; the section is replaced with the mandatory-vs-default distinction.

### When — order of work (TDD)

1. **(8)** `buildRequest('chromosome', values, ['chr','pos','ANNOVAR_gene'])` must produce fields
   without `ref`, `alt`, or the RSID field. **This is the test that reproduces #4** — it fails today
   because line 80 injects all five.
2. **(9)** `setSelected([])` → `['chr','pos']`; hydrating a stored `['ANNOVAR_gene']` →
   `['chr','pos','ANNOVAR_gene']`; locked names first. Fails: `withLocked` does not exist.
3. **(10)** `chr`/`pos` checkboxes are `disabled`; clicking the "Basic Info" row drops `ref`/`alt`/
   `rsid` and keeps `chr`/`pos`; an ordinary leaf still toggles both ways.
4. **(11)** With `localStorage` pre-set to exactly `['chr','pos']`, the workspace still seeds all five
   Basic Info fields. **This is the test that pins the #9 regression risk.** It fails today — the
   current `selected.length > 0` guard sees length 2 and returns early — and passes once the guard is
   rewritten in terms of the invariant.
   Also in (11): the existing test *"leaves an existing stored selection untouched"* (line 87) asserts
   `'ANNOVAR_ensembl_Effect'` and must become `'chr,pos,ANNOVAR_ensembl_Effect'` — hydration now
   prepends the locked pair. The behaviour it guards (a stored user selection is not overwritten by
   the defaults) is unchanged.
5. Implement (1)-(7); delete (12).
6. `npx vitest run`, `npx tsc -b --noEmit`, `npm run build`.
7. Browser pass on both stacks.
8. Docs (13).

Baseline to beat, measured 2026-08-14: **28 tests passing across 8 files**, clean typecheck. Net
expected: 28 − 4 (deleted) + ~8 (added).

### Verification — results

| Check | Result |
| --- | --- |
| `npx vitest run` | **40 passed** across 10 files (baseline 28 across 8; 4 deleted, 16 added) |
| `npx tsc -b --noEmit` | clean |
| `npm run build` | succeeds |
| Real HRC payload (557 entries) | defaults `chr, pos, ref, alt, rs_dbSNP151`; both locked names present as leaves |
| Real TOPMed payload (836 entries) | defaults `chr, pos, ref, alt, rs_dbSNP`; both locked names present as leaves |
| Selection `['chr','pos']` against both payloads | page query and download query contain neither `alt` nor the RSID field |

The payload checks ran the shipped `buildAnnotationStore` / `defaultSelectionForStore` /
`buildRequest` / `buildPageQuery` / `buildDownloadQuery` against responses captured live from
`api-v2.annoq.org` and `api-v2.topmed.annoq.org`, in a throwaway test deleted afterwards.

Two notes on what the change turned up:

- The `AnnotationTree` tests needed `offsetHeight` / `offsetWidth` stubs. `@tanstack/virtual-core`
  measures the scroll element with `offsetHeight`, and jsdom reports zero, so without the stub the
  virtualizer renders **no rows** and every assertion passes vacuously. This is why the pre-existing
  suite drove the tree through the shared selection rather than the DOM.
- `npx vitest run` alone was not sufficient: all 40 tests passed while `tsc` still flagged six stale
  five-argument `buildRequest` calls. Vitest does not typecheck.

### Verification — still outstanding

Automated checks cannot confirm the greyed-out rendering or the pinning, so this remains to be done
before merge:

```bash
npm run dev                                                       # HRC
VITE_ANNOQ_API_V2=https://api-v2.topmed.annoq.org npm run dev     # TOPMed
```

With `localStorage` cleared, on each stack:

| Check | Expected |
| --- | --- |
| Tree on first open | Basic Info fully ticked; `chr`/`pos` greyed and unclickable |
| RSID field shown | `rs_dbSNP151` on HRC, `rs_dbSNP` on TOPMed |
| Untick `alt`, search | `alt` column absent from the table |
| Untick `alt`, download | `alt` absent from the downloaded file |
| Untick "Basic Info" parent | `chr`/`pos` stay ticked; parent shows indeterminate |
| Chromosome search | `chr`/`pos` pinned left, as before |
| "Clear Selection" then Search | runs; table shows `chr` and `pos` only |
| Reload after "Clear Selection" | defaults return |

Note for step 3: MUI already warns "You are providing a disabled `button` child to the Tooltip
component" during the existing test run. Any tooltip added to a disabled checkbox must be wrapped in
a `<span>`, or it will silently not fire and add noise to that warning.

## Why this shape

- **Fixes the cause, not the symptom.** Locking the tree without narrowing `buildRequest` leaves the
  reported behaviour — unticked columns still displayed — in place.
- **The invariant has one home.** Enforced at the single write point every consumer already uses, so
  selection, query, storage, and exported config cannot drift. Divergence between them *is* this bug.
- **Dataset-agnostic.** `chr` and `pos` are stable names on both stacks; ids are not, which was
  [#9](https://github.com/USCbiostats/annoq-site-v2/issues/9) and
  [#7](https://github.com/USCbiostats/annoq-site-v2/issues/7). Nothing here depends on an id.
- **Removes the ambiguity that caused it.** Two same-sounding column lists collapse into one named
  concept each.

## Scope notes

- No API, schema, or shared-contract change — stage-4 UI only, so `/annoq-doc-sync` is not triggered
  and no sibling repo is touched.
- Per `annoq-proj/CLAUDE.md` naming: branch `issue-4-default-pinned-columns`, commits `For #4`.
- Deliberately **not** in scope: forcing the RSID column in `rsID`/`rsIDList` modes — a user who
  unticks it there gets no RSID column, which is now their explicit choice.
- **Pinning stays independent of the selection lock.** `DEFAULT_PINNED_BY_MODE` is unchanged, and the
  pin toggle on `chr`/`pos` remains clickable even though their checkboxes are disabled. Selection
  decides whether a column exists; pinning only decides whether it is frozen during horizontal
  scroll. Two pinned columns cost ~420px, and a user comparing annotations side by side has a
  legitimate reason to reclaim that — unpinning removes nothing and is reversible. Locking the pin
  would also single it out from the filter, stats and count controls, which stay available on those
  columns. Considered and rejected on 2026-08-14.
- Nothing will be committed or pushed. The working tree is left dirty for review.
