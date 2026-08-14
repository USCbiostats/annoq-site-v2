import type {
  AggregationItem as SchemaAggregationItem,
  Bucket as SchemaBucket,
  Gene as SchemaGene
} from './generated/graphql';

export enum ColumnValueType {
  TERM = 'term_id',
  PANTHER_LONG_GENE_ID = 'panther_long_gene_id'
}

// `id` and `parent_id` arrive from /annotations as JSON strings on both the HRC
// and TOPMed stacks. Declaring them as numbers is what let issue #9 ship: a
// comparison against numeric literals type-checked cleanly and matched nothing.
export type Annotation = {
  id: string;
  name: string;
  detail?: string;
  label?: string;
  link?: string;
  pmid?: string;
  parent_id?: string;
  leaf: boolean;
  version?: string;
  value_type?: string;
  field_type?: string;
  root_url?: string;
  api_field?: string;
  keyword_searchable?: boolean;
};

export type AnnotationNode = Annotation & {
  children: AnnotationNode[];
};

export type AnnotationStore = {
  annotations: Annotation[];
  tree: AnnotationNode[];
  byName: Record<string, Annotation>;
  byApiField: Record<string, Annotation>;
  leafNamesByName: Record<string, string[]>;
  rsidField: string;
};

export type QueryMode = 'chromosome' | 'vcf' | 'geneProduct' | 'rsID' | 'rsIDList' | 'keyword';

export type QueryFormValues = {
  chrom: string;
  start: string;
  end: string;
  geneProduct: string;
  rsID: string;
  rsIDList: string;
  vcf: string;
  keyword: string;
};

export type QueryRequest = {
  mode: QueryMode;
  values: QueryFormValues;
  fields: string[];
  filters: string[];
};

/**
 * A partially-selected view of a generated schema type: drops codegen's
 * `__typename`, collapses the `Maybe<>` null unions, and makes every field
 * optional.
 *
 * The generated types describe a *fully* selected object, but the queries in
 * `queryBuilder.ts` deliberately request partial selection sets — `buildStatsQuery`
 * asks for `pos { histogram { key doc_count } }` with no `doc_count`/`min`/`max` —
 * so any field can legitimately be absent at runtime. Using the generated types
 * verbatim would claim a completeness the responses do not have.
 *
 * Deriving these rather than restating them is the point: after
 * `npm run graphql_codegen`, a renamed or retyped schema field fails `tsc` at
 * every use site instead of silently reading `undefined`.
 */
type Selected<T> = {
  [K in keyof Omit<T, '__typename'>]?: NonNullable<T[K]>;
};

// Buckets are only ever selected as a complete `{ key doc_count }` pair.
export type AggregationBucket = Required<Selected<SchemaBucket>>;

export type AggregationItem = Selected<SchemaAggregationItem>;

export type ResultPage = {
  request: QueryRequest;
  page: number;
  pageSize: number;
  total: number;
  rows: Record<string, unknown>[];
  columns: string[];
  aggs: Record<string, AggregationItem>;
  gene?: Selected<SchemaGene>;
  posMin?: number;
  posMax?: number;
};

export type StatsResult = {
  field: string;
  aggs: Record<string, AggregationItem>;
};

export type Panel = 'table' | 'summary' | 'stats';
export type SidePanel = null | 'detail' | 'summary' | 'stats' | 'filters';
