import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useMemo } from 'react';
import { flattenTree } from '../../lib/annotations';
import { useApiVersion } from '../version/useApiVersion';
import type { AnnotationNode, ApiVersionInfo } from '../../types';

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

/**
 * Genome build and dbSNP release of the index the site queries, from api-v2's
 * /version (annoq-api-v2 issue #80). Each api-v2 deployment states its own, so
 * the TOPMed stack reports GRCh38/hg38 and 155 without anything hardcoded here.
 * Omitted, never defaulted, when api-v2 does not report them.
 */
export function apiVersionRows(apiVersion: ApiVersionInfo | undefined): AnnotationVersionRow[] {
  return [
    { name: 'genome_build', label: 'Genome Build', version: apiVersion?.genome_build },
    { name: 'dbsnp_release', label: 'dbSNP Release', version: apiVersion?.dbsnp_release }
  ].filter((row): row is AnnotationVersionRow => Boolean(row.version));
}

export function AnnotationVersionTable({ tree }: { tree: AnnotationNode[] }) {
  const apiVersion = useApiVersion().data;
  const rows = useMemo(
    () => [...apiVersionRows(apiVersion), ...annotationVersionRows(tree)],
    [apiVersion, tree]
  );
  // From api-v2's /version: the WGSA build of the index this site queries.
  const wgsaVersion = apiVersion?.wgsa_version;

  return (
    <>
      {wgsaVersion && (
        <Typography variant="subtitle2" sx={{ pt: 3, pb: 1, px: 1 }}>
          Built using <a href={WGSA_URL} target="_blank" rel="noreferrer">WGSA</a> version {wgsaVersion}
        </Typography>
      )}
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
