import { Dialog, DialogContent, DialogTitle, Link, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import type { Annotation } from '../../types';

export function AnnotationDetailDialog({
  annotation,
  onClose
}: {
  annotation?: Annotation;
  onClose: () => void;
}) {
  const rows = annotation ? [
    ['Name', annotation.label || annotation.name],
    ['Description', annotation.detail || 'No description available.'],
    ['Field', annotation.name],
    ['API field', annotation.api_field || annotation.name],
    ['Type', annotation.field_type || annotation.value_type || ''],
    ['Version', annotation.version || ''],
    ['PMID', annotation.pmid || ''],
    ['Source', annotation.link || '']
  ].filter(([, value]) => Boolean(value)) : [];

  return (
    <Dialog open={Boolean(annotation)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">{annotation?.label || annotation?.name}</Typography>
        {annotation?.name && annotation.name !== annotation.label && (
          <Typography variant="caption" color="text.secondary">{annotation.name}</Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Table size="small" className="annotation-detail-table">
          <TableBody>
            {rows.map(([label, value]) => (
              <TableRow key={label}>
                <TableCell component="th">{label}</TableCell>
                <TableCell>
                  {label === 'PMID' ? (
                    <Link href={`https://www.ncbi.nlm.nih.gov/pubmed/${value}`} target="_blank" rel="noreferrer">{value}</Link>
                  ) : label === 'Source' ? (
                    <Link href={value} target="_blank" rel="noreferrer">{value}</Link>
                  ) : (
                    value
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
