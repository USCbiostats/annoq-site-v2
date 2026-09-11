import { Box, Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { chromosomeStats, type ChromosomeStat } from '../../data/chromosomeStats';

const NCBI_GDP_URL = 'https://ftp.ncbi.nlm.nih.gov/pub/gdp/';
const STATS_FILE_URL =
  'https://github.com/USCbiostats/annoq-site-v2/blob/main/metadata/merge_hrc_topmed_stats.json';

const count = new Intl.NumberFormat('en-US');

/**
 * The count columns, in display order.
 *
 * `mappedInHrc`, `notFoundInHrc` and `notComparableToHg19` are the three values
 * Mapped_in_HRC can take in merge_hrc_topmed.py ('Y', 'N' and '.'), so they add up
 * to the TopMed column exactly. The tooltips say which is which, because the
 * distinction between "not in HRC" and "never compared" is not guessable from a
 * header.
 */
const COLUMNS: Array<{
  key: keyof ChromosomeStat;
  label: string;
  tooltip: string;
}> = [
  {
    key: 'basePairs',
    label: '# of base pairs',
    tooltip: 'Length of the chromosome on GRCh38, from the NCBI ideogram table.'
  },
  {
    key: 'topmedEntries',
    label: '# of entries in TopMed',
    tooltip: 'Total variant rows in the TopMed release for this chromosome.'
  },
  {
    key: 'hg19Entries',
    label: '# of entries in HRC r1.1',
    tooltip:
      'Biallelic SNP rows in the HRC r1.1 reference (hg19/GRCh37). Indels and multiallelic rows are not counted, because the mapping compares SNPs only.'
  },
  {
    key: 'mappedInHrc',
    label: '# mapped in HRC r1.1',
    tooltip:
      'TopMed variants whose hg19 chromosome, position, ref and alt match an HRC r1.1 SNP. These are the rows the "Search HRC data" option returns.'
  },
  {
    key: 'notFoundInHrc',
    label: '# not found in HRC r1.1',
    tooltip:
      'TopMed variants compared against HRC r1.1 and not found in it. Indels fall here, since HRC r1.1 is matched on SNPs only.'
  },
  {
    key: 'notComparableToHg19',
    label: '# not comparable to hg19',
    tooltip:
      'TopMed variants that could not be compared at all, because their hg19 reference allele disagrees with hg38, leaving no hg19 coordinate to look up.'
  }
];

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
              {COLUMNS.map((column) => (
                <TableCell key={column.key} align="right">
                  <Tooltip title={column.tooltip} enterTouchDelay={0}>
                    <span className="data-statistics-header" tabIndex={0}>{column.label}</span>
                  </Tooltip>
                </TableCell>
              ))}
              <TableCell align="right">
                <Tooltip
                  title="HRC r1.1 SNP rows as a percentage of TopMed rows, as reported by merge_hrc_topmed.py. This compares the size of the two releases; it is not the share of TopMed that mapped."
                  enterTouchDelay={0}
                >
                  <span className="data-statistics-header" tabIndex={0}>% of HRC compared to TopMed</span>
                </Tooltip>
              </TableCell>
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
                {COLUMNS.map((column) => (
                  <TableCell key={column.key} align="right">
                    {count.format(row[column.key] as number)}
                  </TableCell>
                ))}
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
