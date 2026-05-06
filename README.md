# Annoq Site

## Prerequisites

Node.js version 20.0.0 or higher

## Installation

```bash
npm install
```

## Local Server

```bash
npm run dev
```

## Building the site

```bash
npm run build
```

## Changing the dataset

To change the dataset used by the site, modify the `./src/lib/environment.ts` file and set the `dataset` variable to the desired dataset name and the `annotationApiV2` variable to the corresponding API base URL. For example:

```typescript
export const environment = {
  dataset: 'annoq-annotations-v5',
  annotationApiV2: 'https://api-v2.annoq.org',
  // other environment variables...
};
```
