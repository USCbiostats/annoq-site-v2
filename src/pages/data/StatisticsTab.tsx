import { Box, Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { chromosomeStats } from '../../data/chromosomeStats';

const NCBI_GDP_URL = 'https://ftp.ncbi.nlm.nih.gov/pub/gdp/';
const STATS_FILE_URL =
  'https://github.com/USCbiostats/annoq-site-v2/blob/main/metadata/merge_hrc_topmed_stats.json';

const count = new Intl.NumberFormat('en-US');

export function StatisticsTab() {
  return (
    <Box className="data-tab-body">
      <Typography className="data-prose" gutterBottom>
        Variant counts per chromosome, comparing the TopMed release with the Haplotype Reference
        Consortium (HRC) data on hg19 and the portion of it mapped into TopMed.
      </Typography>
      <Box className="data-statistics-scroll">
        <Table className="annoq-table data-statistics-table">
          <TableHead>
            <TableRow>
              <TableCell>Chromosome</TableCell>
              <TableCell align="right"># of base pairs</TableCell>
              <TableCell align="right"># of entries in TopMed</TableCell>
              <TableCell align="right"># of entries in HG19</TableCell>
              <TableCell align="right">Mapped in HRC #</TableCell>
              <TableCell align="right">% of HRC compared to TopMed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chromosomeStats.map((row) => (
              <TableRow key={row.chromosome}>
                <TableCell>
                  <Stack className="chromosome-cell" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <img
                      src={row.ideogram}
                      alt={`Chromosome ${row.chromosome} ideogram`}
                      loading="lazy"
                    />
                    <span>{row.chromosome}</span>
                  </Stack>
                </TableCell>
                <TableCell align="right">{count.format(row.basePairs)}</TableCell>
                <TableCell align="right">{count.format(row.topmedEntries)}</TableCell>
                <TableCell align="right">{count.format(row.hg19Entries)}</TableCell>
                <TableCell align="right">{count.format(row.mappedInHrc)}</TableCell>
                <TableCell align="right">{`${row.hrcVsTopmedPct}%`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Stack className="data-sources" spacing={0.5}>
        <Typography variant="body2">
          Chromosome ideograms and base-pair lengths: NCBI{' '}
          <Link href={NCBI_GDP_URL} target="_blank" rel="noreferrer">Genome Decoration Page</Link>,
          GRCh38, 850-band resolution.
        </Typography>
        <Typography variant="body2">
          Entry counts and HRC mapping:{' '}
          <Link href={STATS_FILE_URL} target="_blank" rel="noreferrer">merge_hrc_topmed_stats.json</Link>.
        </Typography>
      </Stack>
    </Box>
  );
}
