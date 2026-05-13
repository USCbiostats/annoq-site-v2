# Testing And Development

## Install

```bash
npm install
```

## Development Server

```bash
npm run dev
```

Default Vite output is usually:

```text
http://localhost:5173/
```

## Build

```bash
npm run build
```

This runs TypeScript build first, then Vite build.

Current known warning:

```text
Some chunks are larger than 500 kB after minification
```

This is a warning, not a build failure. The large data/import surface and chart/UI libraries contribute to bundle size.

## Tests

Run all tests:

```bash
npm test
```

Run one test file:

```bash
npm test -- src/lib/queryBuilder.test.ts
```

Current test files:

- `src/lib/files.test.ts`
- `src/lib/annotations.test.ts`
- `src/lib/queryBuilder.test.ts`

## What Is Covered

Current tests cover:

- Config parsing and file helpers.
- Annotation tree/store helpers.
- Query builder behavior.

## What Should Be Added Next

Useful future tests:

- Query form validation for all query modes.
- Search reducer state transitions.
- Stats field selection behavior.
- Download query payload shape.
- Results table filter and pin behavior.
- Docs path resolution.
- Supported annotations config import/export flow.

## GraphQL Codegen

Config file:

```text
codegen.ts
```

Script:

```bash
npm run graphql:codegen
```

The current app still builds some GraphQL strings dynamically because selected annotation fields are user-driven. Codegen is useful for schema/type references, but dynamic selection remains necessary.

## Environment Variables

Vite environment variables must be prefixed with `VITE_`.

See:

```text
src/lib/environment.ts
```

Common local override example:

```bash
VITE_ANNOQ_API_V2=https://api-v2.annoq.org npm run dev
```

## Pre-Commit Sanity Check

Before handing changes back:

```bash
npm run build
npm test
```

