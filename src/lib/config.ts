export const API_BASE = import.meta.env.VITE_ANNOV_API_BASE ?? 'https://api-v2.annoq.org';
export const GRAPHQL_URL = `${API_BASE}/graphql`;
export const PAGE_SIZE = 50;
export const DEFAULT_SELECTED_ANNOTATION_IDS = [2, 3, 4, 5, 6];
export const BASE_COLUMNS = ['chr', 'pos', 'ref', 'alt', 'rs_dbSNP151'];
export const TERMS_DISPLAYED_SIZE = 8;
export const GENES_DISPLAYED_SIZE = 5;
export const UCSC_URL =
  'https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&lastVirtModeType=default&lastVirtModeExtraState=&virtModeType=default&virtMode=0&nonVirtPosition=&position=chr';
