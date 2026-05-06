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

### Custom Port

To run the local server on a custom port, use the following command:

```bash
npm run dev -- --port <PORT_NUMBER>
```

Example:

```bash
npm run dev -- --port 3000
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
