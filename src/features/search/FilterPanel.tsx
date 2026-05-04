import { Autocomplete, Box, Button, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import { labelFor } from '../../lib/annotations';
import { useAnnotations } from '../annotations/useAnnotations';
import { useSearchState } from './searchState';

export function FilterPanel() {
  const { state, dispatch } = useSearchState();
  const store = useAnnotations().data;
  const result = state.result;
  if (!store || !result) return <Box className="empty-state">No result fields available</Box>;

  const options = result.columns.map((field) => ({ field, label: labelFor(field, store), count: result.aggs[field]?.doc_count ?? 0 }));

  function setFilters(fields: string[]) {
    if (!state.submitted) return;
    dispatch({ type: 'setFilters', filters: fields });
    dispatch({ type: 'submit', request: { ...state.submitted, filters: fields } });
  }

  return (
    <Stack className="panel filter-panel" spacing={1.75}>
      <Box>
        <Typography variant="subtitle2">Annotations With Values</Typography>
        <Typography variant="caption" color="text.secondary">
          Keep variants where the selected annotation fields have values.
        </Typography>
      </Box>
      <Autocomplete
        multiple
        size="small"
        options={options}
        value={options.filter((option) => state.filters.includes(option.field))}
        getOptionLabel={(option) => `${option.label} (${option.count})`}
        onChange={(_, values) => setFilters(values.map((value) => value.field))}
        renderInput={(params) => <TextField {...params} label="Filter by Field" />}
      />
      <Divider />
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2">Active Filters</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" disabled={state.filters.length === 0} onClick={() => setFilters([])}>Clear all</Button>
      </Stack>
      {state.filters.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No filters are currently applied.</Typography>
      ) : (
        <Stack direction="row" spacing={0.75} className="filter-chip-list">
          {state.filters.map((field) => (
            <Chip
              key={field}
              size="small"
              label={labelFor(field, store)}
              onDelete={() => setFilters(state.filters.filter((filter) => filter !== field))}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
