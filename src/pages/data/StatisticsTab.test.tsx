import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatisticsTab } from './StatisticsTab';

describe('StatisticsTab', () => {
  it('renders one row per chromosome, 1-22 then X', () => {
    render(<StatisticsTab />);
    const rows = screen.getAllByRole('row').slice(1); // drop the header row
    expect(rows).toHaveLength(23);
    expect(within(rows[0]).getByText('1')).toBeInTheDocument();
    expect(within(rows[22]).getByText('X')).toBeInTheDocument();
  });

  it('formats counts with thousands separators', () => {
    render(<StatisticsTab />);
    const first = screen.getAllByRole('row')[1];
    // chr1: 248,956,422 bp and 57,577,226 TopMed entries.
    expect(within(first).getByText('248,956,422')).toBeInTheDocument();
    expect(within(first).getByText('57,577,226')).toBeInTheDocument();
  });

  it('gives every chromosome an ideogram with an accessible name', () => {
    render(<StatisticsTab />);
    expect(screen.getByAltText('Chromosome 1 ideogram')).toHaveAttribute(
      'src',
      '/assets/images/chromosomes/chr1.svg'
    );
    expect(screen.getAllByRole('img')).toHaveLength(23);
  });

  it('attributes both data sources below the table', () => {
    render(<StatisticsTab />);
    expect(screen.getByRole('link', { name: /Genome Decoration Page/ })).toHaveAttribute(
      'href',
      'https://ftp.ncbi.nlm.nih.gov/pub/gdp/'
    );
    expect(screen.getByRole('link', { name: /merge_hrc_topmed_stats.json/ })).toHaveAttribute(
      'href',
      'https://github.com/USCbiostats/annoq-site-v2/blob/main/metadata/merge_hrc_topmed_stats.json'
    );
  });

  it('labels the percentage as HRC measured against TopMed', () => {
    render(<StatisticsTab />);
    // Guards the column meaning: hrcVsTopmedPct is HRC's share of TopMed,
    // not the HRC mapping success rate.
    expect(screen.getByText('% of HRC compared to TopMed')).toBeInTheDocument();
    const first = screen.getAllByRole('row')[1];
    expect(within(first).getByText('5.3318%')).toBeInTheDocument();
  });

  it('names the HRC release in both HRC column headers', () => {
    render(<StatisticsTab />);
    expect(screen.getByText('# of entries in HRC r1.1')).toBeInTheDocument();
    expect(screen.getByText('# mapped in HRC r1.1')).toBeInTheDocument();
    // The pre-rename headers must not survive anywhere.
    expect(screen.queryByText('# of entries in HG19')).toBeNull();
    expect(screen.queryByText('Mapped in HRC #')).toBeNull();
  });

  it('breaks the TopMed total into the three Mapped_in_HRC outcomes', () => {
    render(<StatisticsTab />);
    expect(screen.getByText('# not found in HRC r1.1')).toBeInTheDocument();
    expect(screen.getByText('# not comparable to hg19')).toBeInTheDocument();
    // chr1: 2,992,535 Y + 51,568,979 N + 3,015,712 '.' = 57,577,226 TopMed rows.
    const first = screen.getAllByRole('row')[1];
    expect(within(first).getByText('51,568,979')).toBeInTheDocument();
    expect(within(first).getByText('3,015,712')).toBeInTheDocument();
  });

  it('explains the non-obvious count columns with a tooltip', async () => {
    render(<StatisticsTab />);
    fireEvent.mouseOver(screen.getByText('# not comparable to hg19'));
    expect(
      await screen.findByText(/hg19 reference allele disagrees with hg38/i)
    ).toBeInTheDocument();
  });
});
