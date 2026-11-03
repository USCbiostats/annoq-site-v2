import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiVersionInfo } from '../types';
import { VersionPage } from './StaticPages';

// What api-v2's /version answered; undefined is api-v2 not answering.
const apiVersion = vi.hoisted(() => ({ data: undefined as ApiVersionInfo | undefined }));
vi.mock('../features/version/useApiVersion', () => ({
  useApiVersion: () => ({ data: apiVersion.data })
}));

beforeEach(() => {
  apiVersion.data = undefined;
});

// The Angular site built this table from the flattened annotation tree, so rows
// appeared in tree order. The port read the flat /annotations list instead, and
// that list does not arrive in tree order -- which silently reshuffled the page.
//
// The fixture reproduces the shape that makes the two orders disagree: a second
// top-level tool arrives before the first tool's children, so response order
// interleaves the groups while tree order keeps each parent with its children.
vi.mock('../features/annotations/useAnnotations', async () => {
  const { buildAnnotationStore } = await vi.importActual<typeof import('../lib/annotations')>(
    '../lib/annotations'
  );
  const store = buildAnnotationStore([
    { id: '1', name: 'ANNOVAR', leaf: false, version: 'v1' },
    { id: '2', name: 'VEP', leaf: false, version: 'v2' },
    { id: '3', name: 'ANNOVAR gene', parent_id: '1', leaf: true, version: 'v1a' },
    { id: '4', name: 'VEP consequence', parent_id: '2', leaf: true, version: 'v2a' },
    { id: '5', name: 'no version here', parent_id: '1', leaf: true }
  ]);
  return {
    useAnnotations: () => ({ data: store, isLoading: false, error: null })
  };
});

function renderedToolNames() {
  return screen
    .getAllByRole('row')
    .slice(1) // drop the header row
    .map((row) => row.querySelectorAll('td')[0]?.textContent);
}

describe('VersionPage row ordering', () => {
  it('lists tools in annotation-tree order, not API response order', () => {
    render(<MemoryRouter><VersionPage /></MemoryRouter>);

    // Tree order keeps each parent immediately followed by its own children.
    expect(renderedToolNames()).toEqual(['ANNOVAR', 'ANNOVAR gene', 'VEP', 'VEP consequence']);

    // Response order would have put both parents first -- guard against a
    // regression back to reading the flat list.
    expect(renderedToolNames()).not.toEqual([
      'ANNOVAR',
      'VEP',
      'ANNOVAR gene',
      'VEP consequence'
    ]);
  });

  it('omits annotations that carry no version', () => {
    render(<MemoryRouter><VersionPage /></MemoryRouter>);
    expect(screen.queryByText('no version here')).toBeNull();
  });
});

describe('VersionPage genome build and dbSNP release (annoq-api-v2 issue #80)', () => {
  function renderedRows() {
    return screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => Array.from(row.querySelectorAll('td'), (cell) => cell.textContent));
  }

  it('lists the values api-v2 reports ahead of the tool versions', () => {
    apiVersion.data = { genome_build: 'GRCh38/hg38', dbsnp_release: '155' };
    render(<MemoryRouter><VersionPage /></MemoryRouter>);
    expect(renderedRows().slice(0, 3)).toEqual([
      ['Genome Build', 'GRCh38/hg38'],
      ['dbSNP Release', '155'],
      ['ANNOVAR', 'v1']
    ]);
  });

  it('omits them, rather than guessing, when api-v2 does not report them', () => {
    render(<MemoryRouter><VersionPage /></MemoryRouter>);
    expect(screen.queryByText('Genome Build')).toBeNull();
    expect(screen.queryByText('dbSNP Release')).toBeNull();
  });

  it('omits only the value api-v2 leaves out', () => {
    apiVersion.data = { genome_build: 'GRCh37/hg19' };
    render(<MemoryRouter><VersionPage /></MemoryRouter>);
    expect(screen.getByText('GRCh37/hg19')).toBeTruthy();
    expect(screen.queryByText('dbSNP Release')).toBeNull();
  });
});

describe('VersionPage WGSA version', () => {
  it('states the WGSA version api-v2 reports', () => {
    apiVersion.data = { wgsa_version: '0.8' };
    render(<MemoryRouter><VersionPage /></MemoryRouter>);
    expect(screen.getByText(/Built using/).textContent).toBe('Built using WGSA version 0.8');
  });

  it('drops the sentence, rather than guessing, when api-v2 does not report it', () => {
    render(<MemoryRouter><VersionPage /></MemoryRouter>);
    expect(screen.queryByText(/Built using/)).toBeNull();
  });
});
