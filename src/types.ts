export enum ColumnValueType {
  TERM = 'term_id',
  PANTHER_LONG_GENE_ID = 'panther_long_gene_id'
}

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

export type AggregationBucket = {
  key: string | number;
  doc_count: number;
};

export type AggregationItem = {
  doc_count?: number;
  min?: number;
  max?: number;
  missing?: { doc_count: number };
  frequency?: AggregationBucket[];
  histogram?: AggregationBucket[];
};

export type ResultPage = {
  request: QueryRequest;
  page: number;
  pageSize: number;
  total: number;
  rows: Record<string, unknown>[];
  columns: string[];
  aggs: Record<string, AggregationItem>;
  gene?: {
    gene_id?: string;
    contig?: string;
    start?: number;
    end?: number;
  };
  posMin?: number;
  posMax?: number;
};

export type StatsResult = {
  field: string;
  aggs: Record<string, AggregationItem>;
};

export type Panel = 'table' | 'summary' | 'stats';
export type SidePanel = null | 'detail' | 'summary' | 'stats' | 'filters';
