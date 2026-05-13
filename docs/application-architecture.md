# Application Architecture

## High-Level Shape

The app is a client-side React application. Vite serves it during development and builds static assets for production.

Runtime wrapper order in `src/main.tsx`:

```text
React.StrictMode
  ThemeProvider
    CssBaseline
      QueryClientProvider
        BrowserRouter
          App
```

## Routing And Providers

`src/App.tsx` owns route registration.

All routes are wrapped in `AnnotationSelectionProvider`, so annotation choices made on the Supported Annotations page and the Search page are shared.

The `/search` route is additionally wrapped in `SearchProvider`, because the query UI has its own reducer state.

## State Layers

The app intentionally uses a few focused state mechanisms:

- TanStack Query for backend metadata caching.
- React context/localStorage for selected annotations.
- React reducer/context for search workflow state.
- Local component state for temporary UI details such as dialogs, tabs, and column pins.

## Annotation Metadata State

`src/features/annotations/useAnnotations.ts` fetches annotation metadata from:

```text
GET {API_BASE}/annotations
```

Then `buildAnnotationStore` in `src/lib/annotations.ts` normalizes it into:

- `annotations`: flat list.
- `tree`: parent-child tree.
- `byName`: annotation by display/internal name.
- `byApiField`: annotation by backend API field.
- `leafNamesByName`: all leaf descendants for a node.

This store is passed into both the Supported Annotations page and the Search drawer.

## Selected Annotation State

`AnnotationSelectionProvider` stores selected leaf annotation names in:

```text
localStorage["annoq:selectedAnnotations"]
```

This is why a user can select annotations on `/detail`, then open `/search` and keep that selection.

Default selected annotations are initialized in `SearchWorkspace.tsx` using `DEFAULT_SELECTED_ANNOTATION_IDS` from `src/lib/config.ts` only when no saved selection exists.

## Search State

`src/features/search/searchState.tsx` owns the reducer for:

- Current query mode.
- Form values.
- Submitted request.
- Current page.
- Active filters.
- Result page.
- Loading/error state.
- Selected row.
- Selected stats field.
- Current middle panel.
- Right side drawer state.

The important reducer actions are:

- `submit`: clears incompatible old result data, resets page to 1, resets selected row/stats, and starts loading.
- `pageSuccess`: accepts a result only if the request id matches.
- `pageAggsSuccess`: fills aggregate counts after the page result.
- `setPage`: fetches another server page.
- `setStatsField`: changes the selected stats field without automatically opening the side drawer.
- `setSidePanel`: opens/closes the right side drawer.

## Request Safety

`SearchWorkspace.tsx` uses `AbortController` refs for result-page and stats requests:

- `pageAbort`
- `statsAbort`

When a new request replaces an old one, the old request is aborted. The reducer also checks `requestId` so late responses do not overwrite current results.

## Rendering Strategy

The backend paginates results. The frontend normally renders the current page, which is 50 rows by default. The result table may have many columns, so it uses:

- Horizontal scrolling.
- Sticky headers.
- Optional pinned columns.
- Compact cells.
- Dialogs for cell overflow.

The app previously tried row/column virtualization, but the simpler paginated table has been more reliable for this UI and avoids browser hangs.

