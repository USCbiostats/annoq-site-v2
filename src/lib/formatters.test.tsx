import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAnnotationStore } from './annotations';
import { formatCell } from './formatters';
import { ucscAssembly, ucscPositionUrl } from './ucsc';
import { ColumnValueType } from '../types';
import type { Annotation } from '../types';

// What api-v2's /version answered; undefined is api-v2 not answering.
const apiVersion = vi.hoisted(() => ({ data: undefined as { genome_build?: string } | undefined }));
vi.mock('../features/version/useApiVersion', () => ({
  useApiVersion: () => ({ data: apiVersion.data })
}));

afterEach(() => {
  apiVersion.data = undefined;
});

// TERMS_DISPLAYED_SIZE is 8 under test, so 12 items overflow the cell.
const ITEM_COUNT = 12;

const store = buildAnnotationStore([
  { id: '1', name: 'Gene Ontology', leaf: false },
  {
    id: '2',
    parent_id: '1',
    name: 'go_bp',
    label: 'GO biological process',
    leaf: true,
    value_type: ColumnValueType.TERM,
    root_url: 'http://amigo/'
  }
] as Annotation[]);

const value = Array.from({ length: ITEM_COUNT }, (_, i) => `GO:${String(i).padStart(7, '0')}`).join(';');

describe('formatCell view-all contract', () => {
  it('renders only the visible slice in the cell', () => {
    const cell = formatCell('go_bp', value, { go_bp: value }, store);
    render(<div>{cell.node}</div>);
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  it('passes the annotation label as the title, not the raw field name', () => {
    const onViewAll = vi.fn();
    const cell = formatCell('go_bp', value, { go_bp: value }, store, onViewAll);
    render(<div>{cell.node}</div>);
    fireEvent.click(screen.getByRole('button', { name: /View all/ }));
    expect(onViewAll).toHaveBeenCalledTimes(1);
    expect(onViewAll.mock.calls[0][0]).toBe('GO biological process');
  });

  it('passes the item count so the caller can name what it is opening', () => {
    const onViewAll = vi.fn();
    const cell = formatCell('go_bp', value, { go_bp: value }, store, onViewAll);
    render(<div>{cell.node}</div>);
    fireEvent.click(screen.getByRole('button', { name: /View all/ }));
    expect(onViewAll.mock.calls[0][2]).toBe(ITEM_COUNT);
  });

  it('passes a thunk that builds the complete list only when called', () => {
    const onViewAll = vi.fn();
    const cell = formatCell('go_bp', value, { go_bp: value }, store, onViewAll);
    render(<div>{cell.node}</div>);
    fireEvent.click(screen.getByRole('button', { name: /View all/ }));

    const build = onViewAll.mock.calls[0][1];
    expect(typeof build).toBe('function');

    render(<div data-testid="full">{build()}</div>);
    expect(screen.getByTestId('full').querySelectorAll('li')).toHaveLength(ITEM_COUNT);
  });

  it('does not render a view-all button when nothing overflows', () => {
    const short = 'GO:0000001;GO:0000002';
    const cell = formatCell('go_bp', short, { go_bp: short }, store);
    render(<div>{cell.node}</div>);
    expect(screen.queryByRole('button', { name: /View all/ })).not.toBeInTheDocument();
  });
});

describe('ucscAssembly', () => {
  it('takes the hgNN assembly from the genome build api-v2 reports', () => {
    expect(ucscAssembly('GRCh37/hg19')).toBe('hg19');
    expect(ucscAssembly('GRCh38/hg38')).toBe('hg38');
  });

  it('is undefined when there is no build or it names no hgNN assembly', () => {
    expect(ucscAssembly(undefined)).toBeUndefined();
    expect(ucscAssembly(null)).toBeUndefined();
    expect(ucscAssembly('GRCh37')).toBeUndefined();
  });
});

describe('ucscPositionUrl', () => {
  it('opens UCSC on the given assembly at a single base', () => {
    const url = new URL(ucscPositionUrl('hg19', '1', '12345'));
    expect(url.origin + url.pathname).toBe('https://genome.ucsc.edu/cgi-bin/hgTracks');
    expect(url.searchParams.getAll('db')).toEqual(['hg19']);
    expect(url.searchParams.get('position')).toBe('chr1:12345-12345');
  });
});

describe('formatCell pos UCSC link', () => {
  function renderPos(row: Record<string, unknown>) {
    render(<>{formatCell('pos', row.pos, row, store).node}</>);
  }

  function linkParams(name: string) {
    return new URL(screen.getByRole('link', { name }).getAttribute('href') ?? '').searchParams;
  }

  it('links to UCSC on hg19 when api-v2 reports GRCh37/hg19 (HRC)', () => {
    apiVersion.data = { genome_build: 'GRCh37/hg19' };
    renderPos({ chr: '1', pos: 12345 });
    expect(linkParams('12345').get('db')).toBe('hg19');
    expect(linkParams('12345').get('position')).toBe('chr1:12345-12345');
  });

  it('links to UCSC on hg38 when api-v2 reports GRCh38/hg38 (TOPMed)', () => {
    apiVersion.data = { genome_build: 'GRCh38/hg38' };
    renderPos({ chr: 'chrX', pos: 678 });
    expect(linkParams('678').get('db')).toBe('hg38');
    expect(linkParams('678').get('position')).toBe('chrX:678-678');
  });

  it('shows the position unlinked, rather than guess the assembly, when api-v2 reports no build', () => {
    renderPos({ chr: '1', pos: 12345 });
    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
