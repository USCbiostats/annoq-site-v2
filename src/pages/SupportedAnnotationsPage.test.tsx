import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAnnotationStore } from '../lib/annotations';
import type { Annotation } from '../types';
import { AnnotationSelectionProvider } from '../features/annotations/AnnotationSelectionProvider';
import { SupportedAnnotationsPage } from './SupportedAnnotationsPage';

const store = buildAnnotationStore([
  { id: '0', name: 'root', label: 'Annotation', leaf: false },
  { id: '1', parent_id: '0', name: 'Basic Info', leaf: false },
  { id: '26', parent_id: '0', name: 'ANNOVAR', leaf: false, version: 'annovar-2020' },
  { id: '700', parent_id: '0', name: 'HG19 Info', leaf: false },
  { id: '2', parent_id: '1', name: 'chr', leaf: true, version: 'GRCh38' },
  { id: '3', parent_id: '1', name: 'pos', leaf: true },
  { id: '27', parent_id: '26', name: 'ANNOVAR_gene', leaf: true, version: 'annovar-2020' },
  { id: '1202', parent_id: '700', name: 'HRC_chr_pos', leaf: true, version: 'HRC.r1-1' }
] as Annotation[]);

// Mock the hook rather than standing up a QueryClientProvider: the page only
// needs the resolved store, and no network call is under test here.
vi.mock('../features/annotations/useAnnotations', () => ({
  useAnnotations: () => ({ data: store, isLoading: false, error: null })
}));

const gtag = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  gtag.mockClear();
  window.gtag = gtag;
  URL.createObjectURL = vi.fn(() => 'blob:stub');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  delete window.gtag;
});

function renderPage() {
  render(
    <AnnotationSelectionProvider>
      <SupportedAnnotationsPage />
    </AnnotationSelectionProvider>
  );
}

// v1 tracked these three on /detail (issue #59, detail.component.ts).
describe('SupportedAnnotationsPage analytics', () => {
  it('fires export_config for the detail page', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Export Config' }));
    expect(gtag).toHaveBeenCalledWith('event', 'export_config', { page_path: '/detail' });
  });

  it('fires clear_selection for the detail page', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Selection' }));
    expect(gtag).toHaveBeenCalledWith('event', 'clear_selection', { page_path: '/detail' });
  });
});

// annoq-site-v2#22 moved this table to Data > Data Versions; the page is back
// to being just the annotation tree.
describe('SupportedAnnotationsPage tabs', () => {
  it('no longer offers a Data Versions tab', () => {
    renderPage();
    expect(screen.queryByRole('tab', { name: 'Data Versions' })).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('still shows the annotation tree controls', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Upload Config' })).toBeInTheDocument();
  });
});
