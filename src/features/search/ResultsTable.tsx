import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Pagination,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { useMemo, useState } from 'react';
import { graphqlRequest } from '../../lib/api';
import { labelFor } from '../../lib/annotations';
import { PAGE_SIZE } from '../../lib/config';
import { formatCell } from '../../lib/formatters';
import { buildDownloadQuery } from '../../lib/queryBuilder';
import { useAnnotations } from '../annotations/useAnnotations';
import { useSearchState } from './searchState';

export function ResultsTable() {
  const { state, dispatch } = useSearchState();
  const store = useAnnotations().data;
  const [dialog, setDialog] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const result = state.result;

  const columnMeta = useMemo(() => {
    if (!result || !store) return [];
    return result.columns.map((field) => ({
      field,
      label: labelFor(field, store),
      count: result.aggs[field]?.doc_count
    }));
  }, [result, store]);

  function addFilter(field: string) {
    if (!state.submitted || state.filters.includes(field)) return;
    const filters = [...state.filters, field];
    dispatch({ type: 'setFilters', filters });
    dispatch({ type: 'submit', request: { ...state.submitted, filters } });
  }

  async function download() {
    if (!state.submitted || !store) return;
    const data = await graphqlRequest<{ url?: string }>(buildDownloadQuery(state.submitted, store));
    if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer');
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
            {state.filters.length > 0 && <span className="result-pill">Filters {state.filters.length}</span>}
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

      <Box className="simple-results-table-wrap">
        <table className="simple-results-table">
          <thead>
            <tr>
              {columnMeta.map((column) => (
                <th key={column.field}>
                  <Box className="table-head-cell">
                    <Typography variant="caption" className="column-title">{column.label}</Typography>
                    <Stack direction="row" className="column-actions" spacing={0.25}>
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
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, rowIndex) => (
              <tr key={rowIndex} onClick={() => dispatch({ type: 'selectRow', row })}>
                {result.columns.map((field) => (
                  <td key={field}>
                    {formatCell(field, row[field], row, store, (title, content) => setDialog({ title, content })).node}
                  </td>
                ))}
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
