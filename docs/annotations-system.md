# Annotations System

Annotations are central to the app. They determine which fields can be selected and which columns appear in query results.

## Backend Source

Annotations are loaded from:

```text
GET {API_BASE}/annotations
```

The request function is:

```text
src/lib/api.ts
```

The hook is:

```text
src/features/annotations/useAnnotations.ts
```

TanStack Query caches the annotations for 30 minutes.

## Annotation Type

The shared type is in `src/types.ts`:

```ts
export type Annotation = {
  id: number;
  name: string;
  detail?: string;
  label?: string;
  link?: string;
  pmid?: string;
  parent_id?: number;
  leaf: boolean;
  version?: string;
  value_type?: string;
  field_type?: string;
  root_url?: string;
  api_field?: string;
  keyword_searchable?: boolean;
};
```

Important fields:

- `name`: frontend/internal field name.
- `label`: human-friendly display name.
- `api_field`: GraphQL/backend field name.
- `parent_id`: builds the tree.
- `leaf`: whether this is a selectable result field.
- `detail`: description shown under items or in dialogs.
- `version`: shown in data versions.

## Normalized Store

`src/lib/annotations.ts` turns the flat backend list into an `AnnotationStore`:

```ts
export type AnnotationStore = {
  annotations: Annotation[];
  tree: AnnotationNode[];
  byName: Record<string, Annotation>;
  byApiField: Record<string, Annotation>;
  leafNamesByName: Record<string, string[]>;
};
```

Why each map exists:

- `byName`: lookup display/internal names selected by the user.
- `byApiField`: map GraphQL response fields back to frontend names.
- `leafNamesByName`: parent selection can select every descendant leaf.

## Annotation Tree UI

The reusable tree component is:

```text
src/features/annotations/AnnotationTree.tsx
```

Features:

- Search/filter box.
- Parent/child expansion.
- Parent/child selection propagation.
- Indeterminate checkbox state.
- Optional top-level `Annotations` root node.
- Optional details/info callback.
- Optional description display below each annotation.

Used by:

- `SupportedAnnotationsPage`
- `QueryDrawer`

## Selection Persistence

Selected annotation names are stored in:

```text
src/features/annotations/AnnotationSelectionProvider.tsx
```

Storage key:

```text
annoq:selectedAnnotations
```

Selected values are leaf annotation `name` strings, not API fields.

## Config Import/Export

Config files use the old AnnoQ shape:

```json
{ "_source": ["chr", "pos", "ref"] }
```

Parsing lives in:

```text
src/lib/files.ts
```

Both the Supported Annotations page and the Search drawer can import/export this shape.

## Name/API Field Mapping

Selected annotations use frontend names. GraphQL queries must use backend API fields.

Helpers:

```text
src/lib/annotations.ts
```

Important functions:

- `apiFieldFor(name, store)`
- `nameForApiField(apiField, store)`
- `labelFor(name, store)`

The query builder uses `apiFieldFor` before sending GraphQL queries.

Response normalization uses `nameForApiField` so the rest of the UI can keep using frontend names.

