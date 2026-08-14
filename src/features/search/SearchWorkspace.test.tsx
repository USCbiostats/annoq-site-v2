import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Annotation } from '../../types';
import { AnnotationSelectionProvider, useAnnotationSelection } from '../annotations/AnnotationSelectionProvider';
import { SearchProvider } from './searchState';
import { SearchWorkspace } from './SearchWorkspace';

// Ids arrive from the API as JSON strings on both deployment stacks. That is
// the whole of issue #9: the seeding effect compared them against number
// literals, so it matched nothing and the tree opened with everything
// unchecked. A numeric-id fixture would pass against the broken code.
const hrcAnnotations = [
  { id: '0', name: 'root', label: 'Annotation', leaf: false },
  { id: '1', parent_id: '0', name: 'Basic Info', leaf: false },
  { id: '2', parent_id: '1', name: 'chr', api_field: 'chr', leaf: true },
  { id: '3', parent_id: '1', name: 'pos', api_field: 'pos', leaf: true },
  { id: '4', parent_id: '1', name: 'ref', api_field: 'ref', leaf: true },
  { id: '5', parent_id: '1', name: 'alt', api_field: 'alt', leaf: true },
  { id: '6', parent_id: '1', name: 'rs_dbSNP151', label: 'rs ID', api_field: 'rs_dbSNP151', leaf: true },
  { id: '26', parent_id: '0', name: 'ANNOVAR', leaf: false },
  { id: '27', parent_id: '26', name: 'ANNOVAR_ensembl_Effect', api_field: 'ANNOVAR_ensembl_Effect', leaf: true }
] as Annotation[];

const topmedAnnotations = [
  { id: '0', name: 'root', label: 'Annotation', leaf: false },
  { id: '1', parent_id: '0', name: 'Basic Info', leaf: false },
  { id: '2', parent_id: '1', name: 'chr', api_field: 'chr', leaf: true },
  { id: '3', parent_id: '1', name: 'pos', api_field: 'pos', leaf: true },
  { id: '4', parent_id: '1', name: 'ref', api_field: 'ref', leaf: true },
  { id: '5', parent_id: '1', name: 'alt', api_field: 'alt', leaf: true },
  { id: '756', parent_id: '1', name: 'rs_dbSNP', label: 'rs ID', api_field: 'rs_dbSNP', leaf: true }
] as Annotation[];

const fetchAnnotations = vi.fn();

vi.mock('../../lib/api', () => ({
  fetchAnnotations: (signal?: AbortSignal) => fetchAnnotations(signal),
  graphqlRequest: vi.fn(() => Promise.reject(new Error('not expected in this test')))
}));

// The annotation tree is virtualized, so jsdom never gives its rows a
// measurable height. Read the shared selection directly instead of the DOM.
function SelectionProbe() {
  const { selected } = useAnnotationSelection();
  return <output data-testid="selection">{selected.join(',')}</output>;
}

async function renderWorkspace(annotations: Annotation[]) {
  fetchAnnotations.mockResolvedValue(annotations);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AnnotationSelectionProvider>
        <SearchProvider>
          <SelectionProbe />
          <SearchWorkspace />
        </SearchProvider>
      </AnnotationSelectionProvider>
    </QueryClientProvider>
  );
  return screen.findByTestId('selection');
}

beforeEach(() => {
  window.localStorage.clear();
  fetchAnnotations.mockReset();
});

describe('default annotation selection', () => {
  it('selects the VCF fields and RS id when the search window is first opened', async () => {
    const probe = await renderWorkspace(hrcAnnotations);
    await vi.waitFor(() =>
      expect(probe.textContent).toBe('chr,pos,ref,alt,rs_dbSNP151')
    );
  });

  it('selects the RSID field the active dataset actually carries', async () => {
    const probe = await renderWorkspace(topmedAnnotations);
    await vi.waitFor(() => expect(probe.textContent).toBe('chr,pos,ref,alt,rs_dbSNP'));
  });

  it('leaves an existing stored selection untouched', async () => {
    window.localStorage.setItem('annoq:selectedAnnotations', JSON.stringify(['ANNOVAR_ensembl_Effect']));
    const probe = await renderWorkspace(hrcAnnotations);
    await vi.waitFor(() => expect(fetchAnnotations).toHaveBeenCalled());
    expect(probe.textContent).toBe('ANNOVAR_ensembl_Effect');
  });
});
