import type {
  AggregationItem,
  AnnotationStore,
  QueryMode,
  QueryRequest,
  ResultPage,
  StatsResult
} from '../types';
import { apiFieldFor, nameForApiField } from './annotations';
import { BASE_COLUMNS, PAGE_SIZE } from './config';
import { parseRsidList, parseVcfIds } from './files';

type QueryFns = {
  count: string;
  snps: string;
  aggs: string;
  download: string;
};

export const QUERY_FUNCTIONS: Record<QueryMode, QueryFns> = {
  chromosome: {
    count: 'count_SNPs_by_chromosome',
    snps: 'get_SNPs_by_chromosome',
    aggs: 'get_aggs_by_chromosome',
    download: 'download_SNPs_by_chromosome'
  },
  geneProduct: {
    count: 'count_SNPs_by_gene_product',
    snps: 'get_SNPs_by_gene_product',
    aggs: 'get_aggs_by_gene_product',
    download: 'download_SNPs_by_gene_product'
  },
  rsID: {
    count: 'count_SNPs_by_RsID',
    snps: 'get_SNPs_by_RsID',
    aggs: 'get_aggs_by_RsID',
    download: 'download_SNPs_by_RsID'
  },
  rsIDList: {
    count: 'count_SNPs_by_RsIDs',
    snps: 'get_SNPs_by_RsIDs',
    aggs: 'get_aggs_by_RsIDs',
    download: 'download_SNPs_by_RsIDs'
  },
  vcf: {
    count: 'count_SNPs_by_IDs',
    snps: 'get_SNPs_by_IDs',
    aggs: 'get_aggs_by_IDs',
    download: 'download_SNPs_by_IDs'
  }
};

export function buildRequest(
  mode: QueryMode,
  values: QueryRequest['values'],
  selectedAnnotations: string[],
  filters: string[] = []
): QueryRequest {
  return {
    mode,
    values,
    fields: unique([...BASE_COLUMNS, ...selectedAnnotations]),
    filters
  };
}

export function buildPageQuery(request: QueryRequest, page: number, store: AnnotationStore): string {
  const fns = QUERY_FUNCTIONS[request.mode];
  const args = buildArgs(request);
  const filterArgs = buildFilterArgs(request.filters, store);
  const pageArgs = `{from_: ${(page - 1) * PAGE_SIZE}, size: ${PAGE_SIZE}}`;
  const apiFields = request.fields.map((field) => apiFieldFor(field, store));

  return `query AnnoQPage {
    count: ${fns.count}(${formatArgs({ ...args, ...filterArgs })})
    snps: ${fns.snps}(${formatArgs({ ...args, ...filterArgs, query_type_option: 'SNPS', page_args: pageArgs })}) {
      snps { ${apiFields.join(' ')} }
    }
  }`;
}

export function buildCountsQuery(request: QueryRequest, store: AnnotationStore): string {
  const fns = QUERY_FUNCTIONS[request.mode];
  const args = buildArgs(request);
  const filterArgs = buildFilterArgs(request.filters, store);

  return `query AnnoQCounts {
    aggs: ${fns.aggs}(${formatArgs({ ...args, ...filterArgs })}) {
      ${formatAggFields(request.fields, store, false)}
    }
  }`;
}

export function buildGeneInfoQuery(gene: string): string {
  return `query AnnoQGeneInfo { geneInfo: gene_info(gene: ${gqlString(gene)}) { contig end start gene_id } }`;
}

export function buildStatsQuery(request: QueryRequest, field: string, page: ResultPage, store: AnnotationStore): string {
  const fns = QUERY_FUNCTIONS[request.mode];
  const args = buildArgs(request);
  const filterArgs = buildFilterArgs(request.filters, store);
  const interval = page.posMin !== undefined && page.posMax !== undefined
    ? Math.max(1, Math.round((page.posMax - page.posMin) / 100))
    : 10_000;
  const histogram = `{interval: ${interval}, min: ${page.posMin ?? 0}, max: ${page.posMax ?? 0}}`;

  return `query AnnoQStats {
    aggs: ${fns.aggs}(${formatArgs({ ...args, ...filterArgs, histogram })}) {
      ${field === 'pos'
        ? 'pos { doc_count min max histogram { key doc_count } }'
        : `pos { histogram { key doc_count } }
      ${apiFieldFor(field, store)} { doc_count missing { doc_count } frequency { key doc_count } }`}
    }
  }`;
}

export function buildDownloadQuery(request: QueryRequest, store: AnnotationStore): string {
  const fns = QUERY_FUNCTIONS[request.mode];
  const args = buildArgs(request);
  const filterArgs = buildFilterArgs(request.filters, store);
  const fields = `[${request.fields.map((field) => gqlString(apiFieldFor(field, store))).join(',')}]`;
  return `query AnnoQDownload {
    url: ${fns.download}(${formatArgs({ ...args, ...filterArgs, fields })})
  }`;
}

export function normalizePageResponse(
  request: QueryRequest,
  page: number,
  data: { count: number; snps?: { snps?: Record<string, unknown>[] }; aggs?: Record<string, AggregationItem> },
  store: AnnotationStore,
  gene?: ResultPage['gene']
): ResultPage {
  const rows = (data.snps?.snps ?? []).map((row) => {
    const mapped: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      mapped[nameForApiField(key, store)] = value;
    });
    return mapped;
  });
  const aggs: Record<string, AggregationItem> = {};
  Object.entries(data.aggs ?? {}).forEach(([key, value]) => {
    aggs[nameForApiField(key, store)] = value;
  });

  return {
    request,
    page,
    pageSize: PAGE_SIZE,
    total: data.count ?? 0,
    rows,
    columns: request.fields,
    aggs,
    gene,
    posMin: aggs.pos?.min,
    posMax: aggs.pos?.max
  };
}

export function normalizeStatsResponse(
  field: string,
  data: { aggs?: Record<string, AggregationItem> },
  store: AnnotationStore
): StatsResult {
  const aggs: Record<string, AggregationItem> = {};
  Object.entries(data.aggs ?? {}).forEach(([key, value]) => {
    aggs[nameForApiField(key, store)] = value;
  });
  return { field, aggs };
}

function buildArgs(request: QueryRequest): Record<string, unknown> {
  switch (request.mode) {
    case 'chromosome':
      return {
        chr: request.values.chrom.trim().toLowerCase(),
        start: Number.parseInt(request.values.start, 10),
        end: Number.parseInt(request.values.end, 10)
      };
    case 'geneProduct':
      return { gene: request.values.geneProduct.trim() };
    case 'rsID':
      return { rsID: request.values.rsID.trim() };
    case 'rsIDList':
      return { rsIDs: parseRsidList(request.values.rsIDList) };
    case 'vcf':
      return { ids: parseVcfIds(request.values.vcf) };
  }
}

function buildFilterArgs(filters: string[], store: AnnotationStore): Record<string, unknown> {
  if (!filters.length) return {};
  return { filter_args: { exists: filters.map((field) => apiFieldFor(field, store)) } };
}

function formatAggFields(fields: string[], store: AnnotationStore, includeStats: boolean): string {
  return fields
    .map((field) => {
      const apiField = apiFieldFor(field, store);
      const body = field === 'pos'
        ? 'doc_count min max'
        : includeStats
          ? 'doc_count missing { doc_count } frequency { key doc_count }'
          : 'doc_count';
      return `${apiField} { ${body} }`;
    })
    .join('\n');
}

export function formatArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join(', ');
}

function formatValue(value: unknown): string {
  if (value === 'SNPS') return 'SNPS';
  if (typeof value === 'string' && value.startsWith('{')) return value;
  if (Array.isArray(value)) return `[${value.map(formatValue).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .map(([key, val]) => `${key}: ${formatValue(val)}`)
      .join(',')}}`;
  }
  if (typeof value === 'string') return gqlString(value);
  return String(value);
}

function gqlString(value: string): string {
  return JSON.stringify(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
