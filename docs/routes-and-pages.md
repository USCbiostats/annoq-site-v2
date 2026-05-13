# Routes And Pages

Routes are defined in `src/App.tsx`.

## Route Table

| Route | Component | Purpose |
| --- | --- | --- |
| `/` | `HomePage` | Landing page with project overview, tutorial video, stats, access options, publication, partners, browser compatibility. |
| `/search` | `SearchProvider` + `SearchWorkspace` | Main variant annotation query UI. |
| `/detail` | `SupportedAnnotationsPage` | Supported annotation tree, config import/export, data versions. |
| `/about` | `AboutPage` | Project description, members, publication, funding. |
| `/release` | `NewsPage` | Release/news table. |
| `/contact` | `ContactPage` | Contact email. |
| `/cookie-policy` | `CookiePolicyPage` | Cookie and analytics policy. |
| `/version` | `VersionPage` | Data source and annotation tool version summary. |
| `/docs` | `DocsPage` | Docs markdown index. |
| `/docs/:section` | `DocsPage` | Docs section index. |
| `/docs/:section/:page` | `DocsPage` | Docs leaf page. |

## Static Pages

Static pages are grouped in:

```text
src/pages/StaticPages.tsx
```

This file exports:

- `HomePage`
- `AboutPage`
- `NewsPage`
- `ContactPage`
- `CookiePolicyPage`
- `VersionPage`

Supporting static data lives in:

```text
src/data/staticContent.ts
```

## Docs Page

The docs route uses:

```text
src/pages/DocsPage.tsx
```

Markdown content is served from:

```text
public/assets/docs/
```

`DocsPage` maps routes to markdown asset paths. For example:

```text
/docs/tutorials/ui-query
```

loads:

```text
/assets/docs/docs/tutorials/ui-query.md
```

Markdown rendering uses:

- `react-markdown`
- `remark-gfm`
- `rehype-raw`

`rehype-raw` is used because some legacy docs contain inline HTML such as `<strong>` and `<iframe>`.

## Supported Annotations Page

The supported annotations route is:

```text
/detail
```

Component:

```text
src/pages/SupportedAnnotationsPage.tsx
```

It fetches backend annotations through `useAnnotations`, renders `AnnotationTree`, and supports:

- Annotation selection.
- Clear selection.
- Config upload.
- Config export.
- Data versions table.

## Search Page

The search route is:

```text
/search
```

Route element:

```tsx
<SearchProvider>
  <SearchWorkspace />
</SearchProvider>
```

`SearchWorkspace` owns the page layout:

- Left query drawer.
- Center results area.
- Right side drawer for detail/summary/stats/filters.

