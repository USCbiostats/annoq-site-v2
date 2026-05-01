import { Autocomplete, Box, Chip, Stack, TextField, Typography } from '@mui/material';
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
    <Stack className="panel" spacing={1.5}>
      <Typography variant="subtitle2">Annotations With Values</Typography>
      <Autocomplete
        multiple
        size="small"
        options={options}
        value={options.filter((option) => state.filters.includes(option.field))}
        getOptionLabel={(option) => `${option.label} (${option.count})`}
        onChange={(_, values) => setFilters(values.map((value) => value.field))}
        renderInput={(params) => <TextField {...params} label="Filter by Field" />}
      />
    </Stack>
  );
}
