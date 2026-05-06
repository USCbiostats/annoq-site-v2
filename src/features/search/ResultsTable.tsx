import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Pagination,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { graphqlRequest } from '../../lib/api';
import { labelFor } from '../../lib/annotations';
import { API_BASE, PAGE_SIZE } from '../../lib/config';
import { formatCell } from '../../lib/formatters';
import { buildDownloadQuery } from '../../lib/queryBuilder';
import { useAnnotations } from '../annotations/useAnnotations';
import { useSearchState } from './searchState';

const COLUMN_WIDTH = 210;
const DEFAULT_PINNED_BY_MODE = {
  chromosome: ['chr', 'pos'],
  vcf: ['chr', 'pos'],
  geneProduct: ['chr', 'pos'],
  rsID: ['rs_dbSNP151'],
  rsIDList: ['rs_dbSNP151']
} as const;

export function ResultsTable() {
  const { state, dispatch } = useSearchState();
  const store = useAnnotations().data;
  const [dialog, setDialog] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const [pinnedFields, setPinnedFields] = useState<string[]>([]);
  const result = state.result;

  useEffect(() => {
    if (!result) return;
    const defaults = DEFAULT_PINNED_BY_MODE[result.request.mode].filter((field) => result.columns.includes(field));
    setPinnedFields(defaults);
  }, [result?.request.mode, result?.columns.join('|')]);

  const columnMeta = useMemo(() => {
    if (!result || !store) return [];
    return result.columns.map((field) => ({
      field,
      label: labelFor(field, store),
      count: result.aggs[field]?.doc_count
    }));
  }, [result, store]);

  const orderedColumns = useMemo(() => {
    const pinned = pinnedFields.filter((field) => columnMeta.some((column) => column.field === field));
    return [
      ...pinned,
      ...columnMeta.map((column) => column.field).filter((field) => !pinned.includes(field))
    ];
  }, [columnMeta, pinnedFields]);

  const columnByField = useMemo(
    () => new Map(columnMeta.map((column) => [column.field, column])),
    [columnMeta]
  );

  const pinnedOffsets = useMemo(
    () => new Map(pinnedFields.map((field, index) => [field, index * COLUMN_WIDTH])),
    [pinnedFields]
  );

  function setFilters(filters: string[]) {
    if (!state.submitted) return;
    dispatch({ type: 'setFilters', filters });
    dispatch({ type: 'submit', request: { ...state.submitted, filters } });
  }

  function addFilter(field: string) {
    if (!state.submitted || state.filters.includes(field)) return;
    setFilters([...state.filters, field]);
  }

  function removeFilter(field: string) {
    setFilters(state.filters.filter((filter) => filter !== field));
  }

  function togglePinned(field: string) {
    setPinnedFields((current) => {
      if (current.includes(field)) return current.filter((pinned) => pinned !== field);
      return [...current, field];
    });
  }

  async function download() {
    if (!state.submitted || !store) return;
    const data = await graphqlRequest<{ url?: string }>(buildDownloadQuery(state.submitted, store));
    if (data.url) {
      const url = data.url.startsWith('http') ? data.url : `${API_BASE}/download${data.url}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  if (!result || !store) {
    return <Box className="empty-state">{state.loading ? 'Loading results...' : 'No Results'}</Box>;
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const rowStart = result.total === 0 ? 0 : (result.page - 1) * PAGE_SIZE + 1;
  const rowEnd = Math.min(result.page * PAGE_SIZE, result.total);

  return (
    <Box className="results-view">
      <Stack direction="row" sx={{ alignItems: 'center' }} className="results-header">
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle2">Results: <strong>{result.total.toLocaleString()}</strong></Typography>
            <Typography variant="caption" color="text.secondary">Showing {rowStart}-{rowEnd}</Typography>
            {pinnedFields.length > 0 && <span className="result-pill">Pinned {pinnedFields.length}</span>}
          </Stack>
          {result.gene && (
            <Typography variant="caption" color="text.secondary" noWrap>
              Gene Id: {result.gene.gene_id} · Contig: {result.gene.contig} · Start: {result.gene.start} · End: {result.gene.end}
            </Typography>
          )}
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={() => void download()}>Download</Button>
      </Stack>
      {state.filters.length > 0 && (
        <Stack direction="row" spacing={0.75} className="active-filter-bar">
          <Typography variant="caption" className="active-filter-label">Filters</Typography>
          {state.filters.map((field) => (
            <Chip
              key={field}
              size="small"
              label={labelFor(field, store)}
              onDelete={() => removeFilter(field)}
            />
          ))}
          <Button size="small" onClick={() => setFilters([])}>Clear all</Button>
        </Stack>
      )}

      <Box className="simple-results-table-wrap">
        <table className="simple-results-table">
          <thead>
            <tr>
              {orderedColumns.map((field) => {
                const column = columnByField.get(field);
                if (!column) return null;
                const pinnedLeft = pinnedOffsets.get(column.field);
                const isPinned = pinnedLeft !== undefined;
                return (
                <th
                  key={column.field}
                  className={isPinned ? 'pinned-column' : undefined}
                  style={isPinned ? { left: pinnedLeft } : undefined}
                >
                  <Box className="table-head-cell">
                    <Typography variant="caption" className="column-title">{column.label}</Typography>
                    <Stack direction="row" className="column-actions" spacing={0.25}>
                      <Tooltip title={isPinned ? 'Unpin column' : 'Pin column'}>
                        <IconButton size="small" className="table-icon-button" onClick={() => togglePinned(column.field)}>
                          {isPinned ? <PushPinIcon fontSize="inherit" /> : <PushPinOutlinedIcon fontSize="inherit" />}
                        </IconButton>
                      </Tooltip>
                      <Button size="small" variant="text" className="column-count" onClick={() => addFilter(column.field)}>
                        {column.count ?? '-'}
                      </Button>
                      <Tooltip title="Filter rows where this annotation has a value">
                        <IconButton size="small" className="table-icon-button" onClick={() => addFilter(column.field)}><FilterListIcon fontSize="inherit" /></IconButton>
                      </Tooltip>
                      <Tooltip title={`Stats for ${column.label}`}>
                        <IconButton size="small" className="table-icon-button" onClick={() => {
                          dispatch({ type: 'setStatsField', field: column.field });
                          dispatch({ type: 'setSidePanel', sidePanel: 'stats' });
                        }}><BarChartIcon fontSize="inherit" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, rowIndex) => (
              <tr key={rowIndex} onClick={() => dispatch({ type: 'selectRow', row })}>
                {orderedColumns.map((field) => {
                  const pinnedLeft = pinnedOffsets.get(field);
                  const isPinned = pinnedLeft !== undefined;
                  return (
                  <td
                    key={field}
                    className={isPinned ? 'pinned-column' : undefined}
                    style={isPinned ? { left: pinnedLeft } : undefined}
                  >
                    {formatCell(field, row[field], row, store, (title, content) => setDialog({ title, content })).node}
                  </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      <Stack sx={{ alignItems: 'center' }} className="pager">
        <Pagination
          color="primary"
          count={totalPages}
          page={result.page}
          onChange={(_, page) => dispatch({ type: 'setPage', page })}
          size="small"
        />
      </Stack>
      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog?.title}</DialogTitle>
        <DialogContent>{dialog?.content}</DialogContent>
      </Dialog>
    </Box>
  );
}
