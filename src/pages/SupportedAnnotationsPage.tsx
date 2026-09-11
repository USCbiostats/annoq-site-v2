import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { useRef, useState } from 'react';
import { AnnotationTree } from '../features/annotations/AnnotationTree';
import { useAnnotationSelection } from '../features/annotations/AnnotationSelectionProvider';
import { useAnnotations } from '../features/annotations/useAnnotations';
import { trackEvent } from '../lib/analytics';
import { downloadText, parseConfig } from '../lib/files';

export function SupportedAnnotationsPage() {
  const annotations = useAnnotations();
  const { selected, setSelected } = useAnnotationSelection();
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const store = annotations.data;

  async function uploadConfig(file?: File) {
    // On file change, matching v1's (change) binding — a cancelled file dialog
    // was never counted.
    trackEvent('upload_config', { page_path: '/detail' });
    try {
      setError('');
      if (!file || !store) return;
      const source = parseConfig(await file.text()).filter((name) => store.byName[name]?.leaf);
      setSelected(source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid config file');
    }
  }

  return (
    <Container className="simple-page">
      <Typography variant="h3" gutterBottom>Supported Annotations</Typography>
      <Typography className="supported-intro" gutterBottom>
        Currently only human variants are supported.
      </Typography>
      {annotations.isLoading && <CircularProgress />}
      {annotations.error && <Alert severity="error">Unable to load annotation metadata.</Alert>}
      {error && <Alert severity="warning">{error}</Alert>}
      {store && (
        <Paper className="supported-shell">
          <Stack direction="row" spacing={1} className="supported-actions">
            <Button variant="outlined" onClick={() => {
              trackEvent('clear_selection', { page_path: '/detail' });
              setSelected([]);
            }}>Clear Selection</Button>
            <Button variant="outlined" onClick={() => input.current?.click()}>Upload Config</Button>
            <input ref={input} hidden type="file" onChange={(event) => void uploadConfig(event.target.files?.[0])} />
            <Button variant="contained" onClick={() => {
              trackEvent('export_config', { page_path: '/detail' });
              downloadText('config.txt', JSON.stringify({ _source: selected }));
            }}>Export Config</Button>
          </Stack>
          <Box className="supported-tree">
            <AnnotationTree store={store} selected={selected} onSelectedChange={setSelected} showDescriptions />
          </Box>
        </Paper>
      )}
    </Container>
  );
}
