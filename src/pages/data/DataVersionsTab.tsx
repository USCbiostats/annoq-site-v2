import { Box, CircularProgress, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AnnotationVersionTable } from '../../features/annotations/AnnotationVersionTable';
import { useAnnotations } from '../../features/annotations/useAnnotations';

const ARCHIVE_URL = 'http://archive.annoq.org/';

export function DataVersionsTab() {
  const annotations = useAnnotations();

  return (
    <Box className="data-tab-body">
      <Typography className="data-prose" gutterBottom>
        Previous versions of AnnoQ were based on variants from the Haplotype Reference Consortium
        (HRC). The last version with HRC variants can be accessed via{' '}
        <Link href={ARCHIVE_URL} target="_blank" rel="noreferrer">archive.annoq.org</Link>. To
        support users who want to continue using HRC and access TopMed's richer annotations,
        functionality has been added to search for HRC data. The current TopMed SNP data includes
        hg19 mapping information. Since HRC is a subset of hg19, it is possible to determine if a
        given SNP in TopMed is referring to the same SNP in HRC. Not all of the HRC data can be
        mapped to TopMed. Refer to{' '}
        <Link component={RouterLink} to="/data/statistics">Statistics</Link> for detailed chromosome
        specific TOPMed and HRC information.
      </Typography>
      <Box className="data-version-table">
        {annotations.isLoading ? (
          <CircularProgress />
        ) : (
          <AnnotationVersionTable tree={annotations.data?.tree ?? []} />
        )}
      </Box>
    </Box>
  );
}
