import FileUploadIcon from '@mui/icons-material/FileUpload';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Annotation, AnnotationStore, QueryMode } from '../../types';
import { AnnotationTree } from '../annotations/AnnotationTree';
import { AnnotationDetailDialog } from '../annotations/AnnotationDetailDialog';
import { useSearchState } from './searchState';
import { useAnnotationSelection } from '../annotations/AnnotationSelectionProvider';
import { SAMPLE_RSID_LIST, SAMPLE_VCF } from '../../data/samples';
import { downloadText, parseConfig } from '../../lib/files';
import { submitSearch } from './SearchWorkspace';

const modes: Array<{ value: QueryMode; label: string }> = [
  { value: 'chromosome', label: 'Chromosome' },
  { value: 'vcf', label: 'VCF File' },
  { value: 'geneProduct', label: 'Gene Product' },
  { value: 'rsID', label: 'rsID' },
  { value: 'rsIDList', label: 'rsID List' }
];

export function QueryDrawer({
  store,
  onSubmitted,
  onClose
}: {
  store: AnnotationStore;
  onSubmitted: () => void;
  onClose: () => void;
}) {
  const { state, dispatch } = useSearchState();
  const annotationSelection = useAnnotationSelection();
  const [mode, setMode] = useState(state.mode);
  const [values, setValues] = useState(state.values);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | undefined>();
  const [configError, setConfigError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const setSelectedAnnotations = useCallback((names: string[]) => annotationSelection.setSelected(names), [annotationSelection]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryType = params.get('query_type');
    if (queryType === 'chr') setMode('chromosome');
    if (queryType === 'gp') setMode('geneProduct');
    setValues((previous) => ({
      ...previous,
      chrom: params.get('chr') || previous.chrom,
      start: params.get('start') || previous.start,
      end: params.get('end') || previous.end,
      geneProduct: params.get('gp') || previous.geneProduct
    }));
    // URL preload should only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  async function readTextFile(file?: File): Promise<string> {
    if (!file) return '';
    return file.text();
  }

  async function onConfigChange(file?: File) {
    setConfigError('');
    try {
      const source = parseConfig(await readTextFile(file));
      annotationSelection.setSelected(source.filter((name) => store.byName[name]?.leaf));
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Invalid config file');
    }
  }

  function submit() {
    if (!annotationSelection.selected.length) {
      setConfigError('Select at least one annotation from the tree.');
      return;
    }
    submitSearch(mode, values, annotationSelection.selected, [], dispatch);
    onSubmitted();
  }

  return (
    <Box className="drawer-body">
      <Stack className="drawer-header query-drawer-title" direction="row" sx={{ alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle2">Input Query</Typography>
          <Typography variant="caption" className="muted">Selected: {modes.find((item) => item.value === mode)?.label}</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onClose} aria-label="Close query form">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box className="query-provider-note">
        <Typography variant="caption">Variants Annotation Query Provided by IMAGE Project</Typography>
      </Box>

      <Stack className="query-type-row" direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2">Query Type</Typography>
        <FormControl size="small" sx={{ minWidth: 230 }}>
          <InputLabel>Query Type</InputLabel>
          <Select
            label="Query Type"
            value={mode}
            onChange={(event) => setMode(event.target.value as QueryMode)}
          >
            {modes.map((mode) => (
              <MenuItem key={mode.value} value={mode.value}>{mode.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Stack spacing={1.5} className="query-form-section">
        {mode === 'chromosome' && (
          <>
            <TextField size="small" label="Chromosome" value={values.chrom} onChange={(e) => setValues((previous) => ({ ...previous, chrom: e.target.value }))} />
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="Start" value={values.start} onChange={(e) => setValues((previous) => ({ ...previous, start: e.target.value }))} />
              <TextField size="small" label="End" value={values.end} onChange={(e) => setValues((previous) => ({ ...previous, end: e.target.value }))} />
            </Stack>
          </>
        )}
        {mode === 'geneProduct' && (
          <TextField size="small" label="Gene Product" value={values.geneProduct} onChange={(e) => setValues((previous) => ({ ...previous, geneProduct: e.target.value }))} />
        )}
        {mode === 'rsID' && (
          <TextField size="small" label="rsID" value={values.rsID} onChange={(e) => setValues((previous) => ({ ...previous, rsID: e.target.value }))} />
        )}
        {mode === 'rsIDList' && (
          <>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setValues((previous) => ({ ...previous, rsIDList: SAMPLE_RSID_LIST }))}>Sample rsID List</Button>
              <Button size="small" component="label" startIcon={<FileUploadIcon />}>
                Populate
                <input hidden type="file" onChange={async (event) => {
                  const text = await readTextFile(event.target.files?.[0]);
                  setValues((previous) => ({ ...previous, rsIDList: text }));
                }} />
              </Button>
              <Button size="small" onClick={() => setValues((previous) => ({ ...previous, rsIDList: '' }))}>Clear</Button>
            </Stack>
            <TextField multiline minRows={6} label="Enter IDs" value={values.rsIDList} onChange={(e) => setValues((previous) => ({ ...previous, rsIDList: e.target.value }))} />
          </>
        )}
        {mode === 'vcf' && (
          <>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setValues((previous) => ({ ...previous, vcf: SAMPLE_VCF }))}>Sample VCF File</Button>
              <Button size="small" component="label" startIcon={<FileUploadIcon />}>
                Populate
                <input hidden type="file" onChange={async (event) => {
                  const text = await readTextFile(event.target.files?.[0]);
                  setValues((previous) => ({ ...previous, vcf: text }));
                }} />
              </Button>
              <Button size="small" onClick={() => setValues((previous) => ({ ...previous, vcf: '' }))}>Clear</Button>
            </Stack>
            <TextField multiline minRows={6} label="Enter VCF rows" value={values.vcf} onChange={(e) => setValues((previous) => ({ ...previous, vcf: e.target.value }))} />
          </>
        )}
      </Stack>

      <Divider />
      <Stack className="drawer-header" direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2">Select Annotations</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={() => annotationSelection.setSelected([])}>Clear Selection</Button>
      </Stack>
      <Box className="annotation-tree-wrap">
        <AnnotationTree
          store={store}
          selected={annotationSelection.selected}
          onSelectedChange={setSelectedAnnotations}
          onInfo={setActiveAnnotation}
          showRootNode
        />
      </Box>
      {configError && <Alert severity="warning" sx={{ m: 1 }}>{configError}</Alert>}
      <Stack className="drawer-footer" direction="row" spacing={1}>
        <Button size="small" variant="outlined" onClick={() => fileRef.current?.click()}>Upload Config</Button>
        <input ref={fileRef} hidden type="file" onChange={(event) => void onConfigChange(event.target.files?.[0])} />
        <Button size="small" variant="outlined" startIcon={<SaveAltIcon />} onClick={() => downloadText('config.txt', JSON.stringify({ _source: annotationSelection.selected }))}>Export</Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" onClick={submit}>Submit</Button>
      </Stack>
      <AnnotationDetailDialog annotation={activeAnnotation} onClose={() => setActiveAnnotation(undefined)} />
    </Box>
  );
}
