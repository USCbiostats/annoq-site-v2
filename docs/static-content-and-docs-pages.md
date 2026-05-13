# Static Content And Docs Pages

## Static React Pages

Static pages are implemented in:

```text
src/pages/StaticPages.tsx
```

This file contains:

- Landing page.
- About page.
- Release/news page.
- Contact page.
- Cookie policy page.
- Version page.

Supporting static data:

```text
src/data/staticContent.ts
```

## Landing Page

Component:

```text
HomePage
```

Major sections:

- Release banner.
- Hero with video.
- Variant/annotation stat cards.
- TOPMed section.
- Web Browser Access workflow.
- Additional Programmatic Access.
- Publication.
- Trusted resources.
- Browser compatibility table.

Images are loaded from:

```text
public/assets/images/
```

## Release/News Page

Component:

```text
NewsPage
```

Data source:

```text
src/data/staticContent.ts
```

Release descriptions can include trusted HTML links. They are rendered with `dangerouslySetInnerHTML`, so only put known, local, curated content in this data file.

## Version Page

Component:

```text
VersionPage
```

It loads annotation metadata through `useAnnotations`, filters annotations with a `version`, and renders the data version table.

## Markdown Docs

Component:

```text
src/pages/DocsPage.tsx
```

Markdown files:

```text
public/assets/docs/
```

Docs navigation is currently hardcoded in `DocsPage.tsx` as `sections`.

## Docs Path Resolution

`DocsPage` maps browser routes to markdown files.

Examples:

| Browser Route | Markdown File |
| --- | --- |
| `/docs` | `/assets/docs/index.md` |
| `/docs/services` | `/assets/docs/docs/services/index.md` |
| `/docs/services/api` | `/assets/docs/docs/services/api.md` |
| `/docs/tutorials/ui-query` | `/assets/docs/docs/tutorials/ui-query.md` |

## Markdown Rendering

Libraries:

- `react-markdown`
- `remark-gfm`
- `rehype-raw`

Custom renderers:

- Links: internal docs links navigate client-side when possible.
- Images: constrained with `.docs-media`.
- Iframes: rendered and constrained with `.docs-iframe`.
- Headings/paragraphs: converted to MUI typography.

## Adding A Docs Page

1. Add the markdown file under `public/assets/docs/docs/...`.
2. Add a nav entry in `sections` inside `src/pages/DocsPage.tsx`.
3. Verify the route resolves to the intended markdown path.

