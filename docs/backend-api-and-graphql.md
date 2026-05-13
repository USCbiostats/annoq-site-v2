# Backend API And GraphQL

## Configuration

Environment defaults are in:

```text
src/lib/environment.ts
```

Config constants are in:

```text
src/lib/config.ts
```

Default backend:

```text
https://api-v2.annoq.org
```

Relevant environment variables:

| Variable | Purpose |
| --- | --- |
| `VITE_ANNOQ_API_V2` | Preferred backend base URL. |
| `VITE_ANNOV_API_BASE` | Backward-compatible backend base URL. |
| `VITE_ANNOQ_DATASET` | Dataset name. |
| `VITE_ANNOQ_SNP_RESULTS_SIZE` | Result page size. |
| `VITE_ANNOQ_TERMS_DISPLAYED_SIZE` | Number of term-list values shown before overflow. |
| `VITE_ANNOQ_GENES_DISPLAYED_SIZE` | Number of gene-list values shown before overflow. |
| `VITE_ANNOQ_AMIGO_TERM_URL` | AmiGO term link base. |
| `VITE_ANNOQ_PUBMED_URL` | PubMed link base. |
| `VITE_ANNOQ_UCSC_URL` | UCSC browser link base. |
| `VITE_ANNOQ_GA_ID` | Google Analytics measurement id. |

## API Helpers

File:

```text
src/lib/api.ts
```

Functions:

- `fetchAnnotations(signal?)`
- `graphqlRequest<TData>(query, signal?)`

`graphqlRequest` sends:

```http
POST {API_BASE}/graphql
content-type: application/json
```

Body:

```json
{ "query": "..." }
```

It throws on:

- Non-OK HTTP status.
- GraphQL errors.
- Missing `data`.

## Query Mode Function Map

The GraphQL function names are mapped in:

```text
src/lib/queryBuilder.ts
```

| Mode | Count | Page/SNPs | Aggs | Download |
| --- | --- | --- | --- | --- |
| `chromosome` | `count_SNPs_by_chromosome` | `get_SNPs_by_chromosome` | `get_aggs_by_chromosome` | `download_SNPs_by_chromosome` |
| `geneProduct` | `count_SNPs_by_gene_product` | `get_SNPs_by_gene_product` | `get_aggs_by_gene_product` | `download_SNPs_by_gene_product` |
| `rsID` | `count_SNPs_by_RsID` | `get_SNPs_by_RsID` | `get_aggs_by_RsID` | `download_SNPs_by_RsID` |
| `rsIDList` | `count_SNPs_by_RsIDs` | `get_SNPs_by_RsIDs` | `get_aggs_by_RsIDs` | `download_SNPs_by_RsIDs` |
| `vcf` | `count_SNPs_by_IDs` | `get_SNPs_by_IDs` | `get_aggs_by_IDs` | `download_SNPs_by_IDs` |

## Request Building

`buildRequest` combines:

- Base columns: `chr`, `pos`, `ref`, `alt`, plus the rsID field discovered from backend annotations.
- User-selected annotations
- Active filters

Then `buildPageQuery`, `buildCountsQuery`, `buildStatsQuery`, and `buildDownloadQuery` produce GraphQL strings.

## Base Columns

Configured in:

```text
src/lib/config.ts
src/lib/annotations.ts
```

`CORE_BASE_COLUMNS` contains `chr`, `pos`, `ref`, and `alt`.

The rsID column is not hardcoded because different datasets expose different rsID field names. `buildAnnotationStore` detects the rsID field from annotations and stores it as `store.rsidField`.

These are always included in result fields.

## Field Mapping

The user selects frontend annotation names. The backend may require `api_field`.

Before sending GraphQL:

```ts
apiFieldFor(field, store)
```

After receiving GraphQL:

```ts
nameForApiField(apiField, store)
```

Both helpers live in:

```text
src/lib/annotations.ts
```

## Pagination

Page queries include:

```graphql
page_args: { from_: N, size: PAGE_SIZE }
```

`PAGE_SIZE` defaults to 50.

The table only renders the current server page.

## Aggregates

Aggregate queries power:

- Column “with values” counts.
- Position range.
- Summary page.
- Stats panel.
- Filters.

For most fields the app requests:

- `doc_count`
- `missing`
- `frequency`

For `pos`, the app requests:

- `doc_count`
- `min`
- `max`
- `histogram`

## Downloads

The download query must send `fields` as a GraphQL array:

```graphql
fields: ["chr", "pos", "ref", "alt", "<detected rsID field>"]
```

Not as a quoted string:

```graphql
fields: "[\"chr\", \"pos\"]"
```

The frontend opens:

```text
{API_BASE}/download{pathFromBackend}
```

This matches the old Angular behavior.
