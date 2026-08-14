import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAnnotationStore } from '../../lib/annotations';
import type { Annotation } from '../../types';
import { AnnotationSelectionProvider, useAnnotationSelection } from '../annotations/AnnotationSelectionProvider';
import { QueryDrawer } from './QueryDrawer';
import { SearchProvider } from './searchState';

const store = buildAnnotationStore([
  { id: '1', name: 'Basic Info', leaf: false },
  { id: '2', parent_id: '1', name: 'chr', leaf: true },
  { id: '3', parent_id: '1', name: 'pos', leaf: true },
  { id: '6', parent_id: '1', name: 'rs_dbSNP151', label: 'rs ID', leaf: true }
] as Annotation[]);

// The annotation tree is virtualized, so drive the shared selection directly
// instead of clicking rows that jsdom never gives a measurable height.
function SelectionHelper() {
  const { setSelected } = useAnnotationSelection();
  return <button onClick={() => setSelected(['rs_dbSNP151'])}>select an annotation</button>;
}

function renderDrawer() {
  const onSubmitted = vi.fn();
  render(
    <SearchProvider>
      <AnnotationSelectionProvider>
        <SelectionHelper />
        <QueryDrawer store={store} onSubmitted={onSubmitted} onClose={() => undefined} />
      </AnnotationSelectionProvider>
    </SearchProvider>
  );
  return {
    onSubmitted,
    submit: () => fireEvent.click(screen.getByRole('button', { name: 'Submit' })),
    selectAnnotation: () => fireEvent.click(screen.getByRole('button', { name: 'select an annotation' }))
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

// The old "Select at least one annotation from the tree." guard is gone: chr and
// pos are always selected (issue #4), so the state it rejected is unreachable.
// What replaces it is that "Clear Selection" still leaves a submittable query.
describe('QueryDrawer submit', () => {
  it('submits a search when nothing beyond the locked fields is selected', () => {
    const { submit, onSubmitted } = renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Selection' }));
    submit();
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/select at least one annotation/i)).not.toBeInTheDocument();
  });

  it('submits a search after an annotation is selected', () => {
    const { submit, selectAnnotation, onSubmitted } = renderDrawer();
    selectAnnotation();
    submit();
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });
});
