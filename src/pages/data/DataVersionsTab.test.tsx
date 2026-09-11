import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DataVersionsTab } from './DataVersionsTab';

// vi.mock is hoisted above the import, so the static import above already
// resolves against the stub -- same shape as VersionPage.test.tsx.
vi.mock('../../features/annotations/useAnnotations', async () => {
  const { buildAnnotationStore } = await vi.importActual<typeof import('../../lib/annotations')>(
    '../../lib/annotations'
  );
  const store = buildAnnotationStore([
    { id: '1', name: 'ANNOVAR', leaf: false, version: 'v1' },
    { id: '2', name: 'ANNOVAR gene', parent_id: '1', leaf: true, version: 'v1a' }
  ]);
  return { useAnnotations: () => ({ data: store, isLoading: false, error: null }) };
});

function renderTab() {
  render(<MemoryRouter><DataVersionsTab /></MemoryRouter>);
}

describe('DataVersionsTab', () => {
  it('points HRC users at the archive site', () => {
    renderTab();
    expect(screen.getByRole('link', { name: 'archive.annoq.org' })).toHaveAttribute(
      'href',
      'http://archive.annoq.org/'
    );
  });

  it('links the mapping detail to the statistics tab', () => {
    renderTab();
    expect(screen.getByRole('link', { name: 'Data Statistics' })).toHaveAttribute(
      'href',
      '/data/statistics'
    );
  });

  it('says not all HRC data was mapped', () => {
    renderTab();
    expect(screen.getByText(/not all of the HRC data was mapped to TopMed/i)).toBeInTheDocument();
  });

  it('renders the annotation version table moved off Supported Annotations', () => {
    renderTab();
    expect(screen.getByText('SNP Detail/Annotation Tool')).toBeInTheDocument();
    expect(screen.getByText('ANNOVAR gene')).toBeInTheDocument();
  });
});
