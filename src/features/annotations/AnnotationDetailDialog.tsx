import { Dialog, DialogContent, DialogTitle, Link, Stack, Typography } from '@mui/material';
import type { Annotation } from '../../types';

export function AnnotationDetailDialog({
  annotation,
  onClose
}: {
  annotation?: Annotation;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(annotation)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{annotation?.label || annotation?.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.25}>
          <Typography variant="body2">{annotation?.detail || 'No description available.'}</Typography>
          {annotation?.name && <Typography variant="caption">Field: {annotation.name}</Typography>}
          {annotation?.api_field && <Typography variant="caption">API field: {annotation.api_field}</Typography>}
          {annotation?.version && <Typography variant="caption">Version: {annotation.version}</Typography>}
          {annotation?.pmid && (
            <Typography variant="caption">
              PMID: <Link href={`https://www.ncbi.nlm.nih.gov/pubmed/${annotation.pmid}`} target="_blank">{annotation.pmid}</Link>
            </Typography>
          )}
          {annotation?.link && (
            <Link href={annotation.link} target="_blank" rel="noreferrer">
              Source
            </Link>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
