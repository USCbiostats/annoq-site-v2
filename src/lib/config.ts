import { environment } from './environment';

export const API_BASE = environment.annotationApiV2;
export const GRAPHQL_URL = `${API_BASE}/graphql`;
export const PAGE_SIZE = environment.snpResultsSize;
export const DEFAULT_SELECTED_ANNOTATION_IDS = [2, 3, 4, 5, 6];
export const CORE_BASE_COLUMNS = ['chr', 'pos', 'ref', 'alt'];
export const ENABLE_KEYWORD_SEARCH = false;
export const TERMS_DISPLAYED_SIZE = environment.termsDisplayedSize;
export const GENES_DISPLAYED_SIZE = environment.genesDisplayedSize;
export const UCSC_URL = environment.ucscUrl;
