# Default Field Selection — Design

Resolves [#9](https://github.com/USCbiostats/annoq-site-v2/issues/9): *"When Search window is first opened, system should select VCF fields and RS id by default"*

Branch: `issue-9-default-field-selection`
Date: 2026-08-14
Status: implemented; verified against both live API payloads. **Not yet verified in a browser** —
no browser or Playwright is available in this environment (see "Verification" below).

> Default VCF fields are `chr, pos, ref, alt` and the RSID field should also be selected. These fields are categorized under "Basic Info."

## What is actually wrong

The feature is **already written**. `SearchWorkspace.tsx:60-78` runs an effect that seeds a default
annotation selection on first mount, driven by `DEFAULT_SELECTED_ANNOTATION_IDS` in `src/lib/config.ts`:

```ts
export const DEFAULT_SELECTED_ANNOTATION_IDS = [2, 3, 4, 5, 6];   // src/lib/config.ts:6
```

Against the live HRC annotation payload those ids are exactly the five fields the issue asks for:

| id | name | parent |
| --- | --- | --- |
| `"2"` | `chr` | Basic Info |
| `"3"` | `pos` | Basic Info |
| `"4"` | `ref` | Basic Info |
| `"5"` | `alt` | Basic Info |
| `"6"` | `rs_dbSNP151` (label "rs ID") | Basic Info |

So the intent is right and the ids are right. The selection is nevertheless always empty.

### Root cause — a string/number comparison that can never match

The API returns `id` and `parent_id` as **JSON strings**, not numbers. Verified against both
deployment stacks:

```
$ curl -s https://api-v2.annoq.org/annotations         # HRC, 557 entries
id types: {'str'}   parent_id types: {'str', 'NoneType'}
  '2' '1' 'chr'  leaf=True   '3' '1' 'pos'  leaf=True   ...

$ curl -s https://api-v2.topmed.annoq.org/annotations   # TOPMed, 836 entries
id types: {'str'}   parent_id types: {'str', 'NoneType'}
```

The seeding effect filters with `Array.prototype.includes`, which uses SameValueZero — strict, no
numeric coercion:

```ts
.filter((annotation) => DEFAULT_SELECTED_ANNOTATION_IDS.includes(annotation.id))   // SearchWorkspace.tsx:65
```

```
$ node -e 'console.log([2,3,4,5,6].includes("2"))'
false
```

The filter therefore matches **nothing**, `defaults.size === 0`, the effect returns at line 76
without ever calling `setSelected`, and the tree opens with every box unchecked. That is the whole
bug.

### Why TypeScript did not catch it

`src/types.ts` declares the field as a number:

```ts
export type Annotation = {
  id: number;          // src/types.ts:7  — contradicts the live payload
  parent_id?: number;  // src/types.ts:13
```

Because the declared type is `number`, `includes(annotation.id)` on a `number[]` type-checks
cleanly. The type is simply wrong about the API, and that untruth is what let a comparison that can
never succeed pass both `tsc` and review. `buildAnnotationTree` is unaffected only by luck — it uses
the values as `Map` keys on both sides of the lookup, so string-vs-string stays self-consistent and
the tree renders correctly.

### A second, independent defect in the same line

Even with the string/number mismatch repaired, keying defaults off numeric ids is wrong across
stacks. On TOPMed, "Basic Info" holds a **different** RSID field:

| Stack | RSID field under Basic Info |
| --- | --- |
| HRC (production) | id `6` — `rs_dbSNP151` |
| TOPMed (beta) | id `756` — `rs_dbSNP` |

Id `6` does not exist in the TOPMed payload. A minimal `['2','3','4','5','6']` fix would select
chr/pos/ref/alt on TOPMed and silently drop the RSID column — reintroducing half of #9 on the beta
stack. `annoq-proj/CLAUDE.md` requires dataset-agnostic code changes to be correct on both
instances, so id-based defaults have to go rather than be patched.

### The codebase already has the dataset-agnostic answer

`baseColumnsForStore` resolves the same five fields **by name**, with `findRsidField` picking
`rs_dbSNP151` or `rs_dbSNP` from whatever the store actually contains:

```ts
export function baseColumnsForStore(store: AnnotationStore): string[] {
  return ['chr', 'pos', 'ref', 'alt', store.rsidField];   // src/lib/annotations.ts:78-80
}
```

It is also **already the source of truth for every query**. `buildRequest` unconditionally prepends
it to the requested fields:

```ts
fields: unique([...(store ? baseColumnsForStore(store) : [...]), ...selectedAnnotations])  // queryBuilder.ts:69
```

This makes the bug worse than a missing convenience: those five columns are fetched and rendered on
*every* search regardless of the tree, so today the tree shows them unchecked while the results
table shows them present. Seeding from `baseColumnsForStore` fixes #9 and makes the checkboxes
honest about what the app sends.

## The fix

Replace id-matching with name-matching against `baseColumnsForStore(store)`, and correct the type
that hid the bug.

### Where

| # | File | Change |
| --- | --- | --- |
| 1 | `src/lib/annotations.ts` | Add `defaultSelectionForStore(store)` — `baseColumnsForStore` filtered to names that exist as leaves in this store. Retype the `buildAnnotationTree` map to `Map<string, AnnotationNode>`. |
| 2 | `src/features/search/SearchWorkspace.tsx` | Seeding effect calls `defaultSelectionForStore(store)`; drop the `DEFAULT_SELECTED_ANNOTATION_IDS` / `findNodeByName` / `collectLeafNames` id walk. |
| 3 | `src/lib/config.ts` | Delete `DEFAULT_SELECTED_ANNOTATION_IDS` — dead once (2) lands, and leaving it invites the same mistake again. |
| 4 | `src/types.ts` | `id: number` → `id: string`, `parent_id?: number` → `parent_id?: string`. |
| 5 | `src/lib/annotations.test.ts` | Unit tests for `defaultSelectionForStore` on HRC- and TOPMed-shaped fixtures. |
| 6 | `src/features/search/SearchWorkspace.test.tsx` *(new)* | Regression test that the workspace actually seeds the selection — the wiring the unit test cannot see. |
| 7 | `docs/search-query-ui.md` | Document the default selection and where it comes from. |

`CORE_BASE_COLUMNS` (`config.ts:7`) is also unused, but it is unrelated to #9 and is left alone.

### How — target shape of the seeding effect

```ts
useEffect(() => {
  if (!store || defaultsInitialized.current || annotationSelection.selected.length > 0) return;
  defaultsInitialized.current = true;
  const defaults = defaultSelectionForStore(store);
  if (defaults.length === 0) return;
  annotationSelection.setSelected(defaults);
}, [annotationSelection, store]);
```

The guard is deliberately unchanged: seed whenever the workspace mounts with nothing selected.
"Clear Selection" therefore still clears for the rest of the session, and defaults return on the
next reload. This is the existing designed behaviour; #9 asks only that the defaults appear, so the
guard stays out of scope.

### When — order of work (TDD)

1. Write test (5) against `defaultSelectionForStore` with a **string-id** fixture. Fails: function does not exist.
2. Write test (6) rendering `SearchWorkspace` with `fetchAnnotations` mocked to a string-id fixture, asserting the five names land in the shared selection. Fails today for the real reason — `includes` never matches. **This is the test that reproduces #9.**
3. Implement (1), (2), (4); delete (3).
4. Re-run: `npx vitest run` and `npx tsc -b --noEmit`. Baseline to beat is 21 passing tests and a clean typecheck.
5. Verify in the browser against both stacks — HRC via `npm run dev`, TOPMed via `VITE_ANNOQ_API_V2=https://api-v2.topmed.annoq.org npm run dev` — with `localStorage` cleared. Expect "Basic Info" fully checked, showing `rs_dbSNP151` on HRC and `rs_dbSNP` on TOPMed.
6. Update docs (7).

Test (2) is the one that matters: a fixture with **string** ids is what makes it fail before the fix
and pass after. A fixture with numeric ids would pass against the broken code and prove nothing.

### Why this shape

- **Fixes the origin, not the symptom.** The alternative one-character fix (`['2','3','4','5','6']`)
  leaves the wrong type in `types.ts` and still breaks TOPMed's RSID column.
- **One source of truth.** Defaults and query fields both derive from `baseColumnsForStore`, so they
  cannot drift apart.
- **Survives dataset changes.** Nothing depends on an id that a re-index may renumber — the class of
  breakage already seen in [#7](https://github.com/USCbiostats/annoq-site-v2/issues/7).
- **Correct on both stacks** without a per-stack config value, as `annoq-proj/CLAUDE.md` requires.

## Verification

| Check | Result |
| --- | --- |
| `npx vitest run` | **28 passed** (baseline was 21; 7 added) |
| `npx tsc -b --noEmit` | clean |
| `npm run build` | succeeds |
| Real HRC payload (557 entries) | `defaultSelectionForStore` → `chr, pos, ref, alt, rs_dbSNP151` |
| Real TOPMed payload (836 entries) | `defaultSelectionForStore` → `chr, pos, ref, alt, rs_dbSNP` |
| Old numeric-id filter vs. both payloads | matched **0** annotations — confirms the root cause |

The two payload checks ran the shipped `buildAnnotationStore` / `defaultSelectionForStore` against
responses captured live from `api-v2.annoq.org` and `api-v2.topmed.annoq.org`, in a throwaway test
that was deleted afterwards.

The type correction in step (4) immediately surfaced four latent numeric-id fixtures — in
`AnnotationTree.tsx` (the synthetic root node) and three existing test files — all of which
contradicted the real payload. They are corrected in this change.

**Still outstanding:** the browser pass in step 5 of the plan. This environment has no browser and no
Playwright, so the rendered checkbox state in "Basic Info" has not been confirmed by eye on either
stack. Worth doing before merge:

```bash
npm run dev                                                          # HRC
VITE_ANNOQ_API_V2=https://api-v2.topmed.annoq.org npm run dev        # TOPMed
```

with `localStorage` cleared; expect "Basic Info" fully checked, showing `rs_dbSNP151` on HRC and
`rs_dbSNP` on TOPMed.

## Scope notes

- No API, schema, or shared-contract change — this is stage-4 UI only, so `/annoq-doc-sync` is not
  triggered.
- Per `annoq-proj/CLAUDE.md` naming: issue is owned by `annoq-site-v2`, branch is
  `issue-9-default-field-selection`, commits are `For #9`. No sibling repo is touched.
- Nothing will be committed — the working tree is left dirty for review.
