import { environment } from './environment';

export const API_BASE = environment.annotationApiV2;
export const GRAPHQL_URL = `${API_BASE}/graphql`;
export const PAGE_SIZE = environment.snpResultsSize;
/**
 * Annotations the user cannot deselect (issue #4). They identify the variant,
 * and `formatCell` builds the UCSC link on every `pos` cell out of the row's
 * `chr`, so losing either degrades the results table silently.
 *
 * Distinct from the *default* selection, which is every "Basic Info" field and
 * is merely the initial checkbox state — see `defaultSelectionForStore` in
 * `src/lib/annotations.ts`. Conflating the two is what made unticking `alt` do
 * nothing.
 *
 * Names, never ids: ids differ between the HRC and TOPMed datasets and are
 * renumbered by re-indexing (issues #7 and #9). `chr` and `pos` are stable on
 * both stacks.
 */
export const LOCKED_ANNOTATION_NAMES = ['chr', 'pos'];
export const ENABLE_KEYWORD_SEARCH = false;
export const TERMS_DISPLAYED_SIZE = environment.termsDisplayedSize;
export const GENES_DISPLAYED_SIZE = environment.genesDisplayedSize;
export const UCSC_URL = environment.ucscUrl;
