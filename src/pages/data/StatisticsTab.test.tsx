import { render, screen, within } from '@testing-library/react';
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
});
