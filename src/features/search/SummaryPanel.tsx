import BarChartIcon from '@mui/icons-material/BarChart';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Box, IconButton, List, ListItem, ListItemText, Stack, Tooltip, Typography } from '@mui/material';
import { labelFor } from '../../lib/annotations';
import { useAnnotations } from '../annotations/useAnnotations';
import { useSearchState } from './searchState';

export function SummaryPanel({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useSearchState();
  const store = useAnnotations().data;
  const result = state.result;

  if (!result || !store) return <Box className="empty-state">No Results</Box>;

  function addFilter(field: string) {
    if (!state.submitted || state.filters.includes(field)) return;
    const filters = [...state.filters, field];
    dispatch({ type: 'setFilters', filters });
    dispatch({ type: 'submit', request: { ...state.submitted, filters } });
  }

  return (
    <Box className={compact ? 'panel compact-panel' : 'panel'}>
      <Typography variant="subtitle2" sx={{ p: 1 }}>Summary</Typography>
      <Box className="summary-pos-range">
        <Typography variant="subtitle2">Pos Range</Typography>
        <Stack direction="row" spacing={3}>
          <Typography variant="body2"><strong>From:</strong> {result.posMin ?? '-'}</Typography>
          <Typography variant="body2"><strong>To:</strong> {result.posMax ?? '-'}</Typography>
        </Stack>
      </Box>
      <List dense>
        {result.columns.map((field) => (
          <ListItem
            key={field}
            secondaryAction={
              <Stack direction="row">
                <Tooltip title="Filter by exists">
                  <IconButton size="small" onClick={() => addFilter(field)}><FilterListIcon fontSize="inherit" /></IconButton>
                </Tooltip>
                <Tooltip title="Stats">
                  <IconButton size="small" onClick={() => {
                    dispatch({ type: 'setStatsField', field });
                    dispatch({ type: 'setSidePanel', sidePanel: 'stats' });
                  }}><BarChartIcon fontSize="inherit" /></IconButton>
                </Tooltip>
              </Stack>
            }
          >
            <ListItemText
              primary={labelFor(field, store)}
              secondary={`With values: ${result.aggs[field]?.doc_count ?? 0}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
