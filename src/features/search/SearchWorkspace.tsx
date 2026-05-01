import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import BarChartIcon from '@mui/icons-material/BarChart';
import ListIcon from '@mui/icons-material/List';
import SearchIcon from '@mui/icons-material/Search';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  Alert,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { graphqlRequest } from '../../lib/api';
import {
  buildGeneInfoQuery,
  buildCountsQuery,
  buildPageQuery,
  buildRequest,
  buildStatsQuery,
  normalizePageResponse,
  normalizeStatsResponse
} from '../../lib/queryBuilder';
import { DEFAULT_SELECTED_ANNOTATION_IDS } from '../../lib/config';
import { collectLeafNames, findNodeByName } from '../../lib/annotations';
import { useAnnotationSelection } from '../annotations/AnnotationSelectionProvider';
import { useAnnotations } from '../annotations/useAnnotations';
import { useSearchState } from './searchState';
import { QueryDrawer } from './QueryDrawer';
import { ResultsTable } from './ResultsTable';
import { SummaryPanel } from './SummaryPanel';
import { StatsPanel } from './StatsPanel';
import { DetailPanel } from './DetailPanel';
import { FilterPanel } from './FilterPanel';
import type { ResultPage } from '../../types';

export function SearchWorkspace() {
  const annotationsQuery = useAnnotations();
  const annotationSelection = useAnnotationSelection();
  const { state, dispatch } = useSearchState();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [annotationDrawerOpen, setAnnotationDrawerOpen] = useState(!isMobile);
  const pageAbort = useRef<AbortController | null>(null);
  const statsAbort = useRef<AbortController | null>(null);
  const defaultsInitialized = useRef(false);

  const store = annotationsQuery.data;

  useEffect(() => {
    if (!store || defaultsInitialized.current || annotationSelection.selected.length > 0) return;
    defaultsInitialized.current = true;
    const defaults = new Set<string>();
    store.annotations
      .filter((annotation) => DEFAULT_SELECTED_ANNOTATION_IDS.includes(annotation.id))
      .forEach((annotation) => {
        if (annotation.leaf) {
          defaults.add(annotation.name);
          return;
        }
        const node = findNodeByName(store.tree, annotation.name);
        if (node) {
          collectLeafNames(node).forEach((name) => defaults.add(name));
        }
      });
    if (defaults.size === 0) return;
    annotationSelection.setSelected([...defaults]);
  }, [annotationSelection, store]);

  useEffect(() => {
    if (!store || !state.submitted) return;
    const annotationStore = store;
    const requestId = state.requestId;
    const request = state.submitted;
    const page = state.page;
    pageAbort.current?.abort();
    const controller = new AbortController();
    pageAbort.current = controller;

    async function load() {
      try {
        let gene: ResultPage['gene'];
        if (request.mode === 'geneProduct') {
          const geneData = await graphqlRequest<{ geneInfo?: ResultPage['gene'] }>(
            buildGeneInfoQuery(request.values.geneProduct),
            controller.signal
          );
          gene = geneData.geneInfo;
          if (!gene) throw new Error('Gene product was not found');
        }
        const query = buildPageQuery(request, page, annotationStore);
        const data = await graphqlRequest<{ count: number; snps?: { snps?: Record<string, unknown>[] }; aggs?: ResultPage['aggs'] }>(
          query,
          controller.signal
        );
        dispatch({ type: 'pageSuccess', requestId, result: normalizePageResponse(request, page, data, annotationStore, gene) });
        void graphqlRequest<{ aggs?: ResultPage['aggs'] }>(buildCountsQuery(request, annotationStore), controller.signal)
          .then((aggData) => {
            dispatch({
              type: 'pageAggsSuccess',
              requestId,
              aggs: normalizePageResponse(request, page, { count: data.count, snps: { snps: [] }, aggs: aggData.aggs }, annotationStore, gene).aggs
            });
          })
          .catch((error) => {
            if (!controller.signal.aborted) console.warn(error);
          });
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({ type: 'pageError', requestId, error: error instanceof Error ? error.message : 'Search failed' });
      }
    }

    void load();
    return () => controller.abort();
  }, [dispatch, state.page, state.requestId, state.submitted, store]);

  useEffect(() => {
    if (!store || !state.submitted || !state.result || !state.statsField) return;
    const annotationStore = store;
    statsAbort.current?.abort();
    const controller = new AbortController();
    statsAbort.current = controller;

    async function loadStats() {
      try {
        const data = await graphqlRequest<{ aggs?: ResultPage['aggs'] }>(
          buildStatsQuery(state.submitted!, state.statsField!, state.result!, annotationStore),
          controller.signal
        );
        dispatch({ type: 'statsSuccess', stats: normalizeStatsResponse(state.statsField!, data, annotationStore) });
      } catch (error) {
        if (!controller.signal.aborted) console.warn(error);
      }
    }

    void loadStats();
    return () => controller.abort();
  }, [dispatch, state.result, state.statsField, state.submitted, store]);

  const sideTitle = {
    detail: 'Variant Details',
    summary: 'Summary',
    stats: 'Results Details & Stats',
    filters: 'Filter By'
  }[state.sidePanel ?? 'detail'];

  const body = useMemo(() => {
    if (state.panel === 'summary') return <SummaryPanel />;
    if (state.panel === 'stats') return <StatsPanel />;
    return <ResultsTable />;
  }, [state.panel]);

  if (annotationsQuery.isLoading) {
    return <Centered><CircularProgress /></Centered>;
  }

  if (annotationsQuery.error || !store) {
    return <Alert severity="error">Unable to load annotation metadata.</Alert>;
  }

  return (
    <Box className="search-shell">
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={annotationDrawerOpen}
        onClose={() => setAnnotationDrawerOpen(false)}
        slotProps={{ paper: { className: 'query-drawer' } }}
      >
        <QueryDrawer
          store={store}
          onSubmitted={() => {
            if (isMobile) setAnnotationDrawerOpen(false);
          }}
        />
      </Drawer>

      <Box className="search-main" sx={{ ml: !isMobile && annotationDrawerOpen ? '360px' : 0 }}>
        <Toolbar className="search-tools" variant="dense">
          <Tooltip title="Search and annotations">
            <IconButton color="primary" onClick={() => setAnnotationDrawerOpen(true)}>
              <SearchIcon />
            </IconButton>
          </Tooltip>
          <Tabs
            value={state.panel}
            onChange={(_, panel) => dispatch({ type: 'setPanel', panel })}
            aria-label="Result views"
          >
            <Tab icon={<TableChartIcon />} iconPosition="start" label="Table" value="table" />
            <Tab icon={<ListIcon />} iconPosition="start" label="Summary" value="summary" />
            <Tab icon={<BarChartIcon />} iconPosition="start" label="Stats" value="stats" />
          </Tabs>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Filters">
            <IconButton disabled={!state.result} onClick={() => dispatch({ type: 'setSidePanel', sidePanel: 'filters' })}>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>

        {state.error && <Alert severity="warning" sx={{ m: 1 }}>{state.error}</Alert>}
        <Box className="result-area">
          {body}
          {state.loading && (
            <Box className="loading-overlay">
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={Boolean(state.sidePanel)}
        onClose={() => dispatch({ type: 'setSidePanel', sidePanel: null })}
        slotProps={{ paper: { className: 'side-drawer' } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center' }} className="drawer-header">
          <Typography variant="subtitle2">{sideTitle}</Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => dispatch({ type: 'setSidePanel', sidePanel: null })}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
        {state.sidePanel === 'detail' && <DetailPanel />}
        {state.sidePanel === 'summary' && <SummaryPanel compact />}
        {state.sidePanel === 'stats' && <StatsPanel compact />}
        {state.sidePanel === 'filters' && <FilterPanel />}
      </Drawer>
    </Box>
  );
}

export function submitSearch(
  mode: ReturnType<typeof useSearchState>['state']['mode'],
  values: ReturnType<typeof useSearchState>['state']['values'],
  selectedAnnotationNames: string[],
  filters: string[],
  dispatch: ReturnType<typeof useSearchState>['dispatch']
) {
  const request = buildRequest(mode, values, selectedAnnotationNames, filters);
  dispatch({ type: 'submit', request });
}

function Centered({ children }: { children: React.ReactNode }) {
  return <Box sx={{ minHeight: 300, display: 'grid', placeItems: 'center' }}>{children}</Box>;
}
