import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useMemo } from 'react';
import { flattenTree } from '../../lib/annotations';
import type { AnnotationNode } from '../../types';

const WGSA_URL = 'https://sites.google.com/site/jpopgen/wgsa';

export type AnnotationVersionRow = {
  name: string;
  label: string;
  version: string;
};

/**
 * Tree order, not `store.annotations` order: /annotations lists every category
 * node before any leaf, so the raw array puts unrelated rows next to each other.
 * Walking the tree groups each row under its category. Both callers of this
 * table had independently fixed the same bug; keeping the walk here keeps it
 * fixed in one place.
 */
export function annotationVersionRows(tree: AnnotationNode[]): AnnotationVersionRow[] {
  return flattenTree(tree)
    .filter((annotation) => annotation.version && annotation.name)
    .map((annotation) => ({
      name: annotation.name,
      label: annotation.label || annotation.name,
      version: annotation.version as string
    }));
}

export function AnnotationVersionTable({ tree }: { tree: AnnotationNode[] }) {
  const rows = useMemo(() => annotationVersionRows(tree), [tree]);

  return (
    <>
      <Typography variant="subtitle2" sx={{ p: 1 }}>
        Built using <a href={WGSA_URL} target="_blank" rel="noreferrer">WGSA</a> version 095
      </Typography>
      <Table className="annoq-table">
        <TableHead>
          <TableRow>
            <TableCell>SNP Detail/Annotation Tool</TableCell>
            <TableCell>Version</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell>{row.label}</TableCell>
              <TableCell>{row.version}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
