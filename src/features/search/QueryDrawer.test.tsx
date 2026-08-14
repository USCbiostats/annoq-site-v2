import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAnnotationStore } from '../../lib/annotations';
import type { Annotation } from '../../types';
import { AnnotationSelectionProvider, useAnnotationSelection } from '../annotations/AnnotationSelectionProvider';
import { QueryDrawer } from './QueryDrawer';
import { SearchProvider } from './searchState';

const EMPTY_SELECTION_WARNING = 'Select at least one annotation from the tree.';

const store = buildAnnotationStore([
  { id: '1', name: 'Basic Info', leaf: false },
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

describe('QueryDrawer empty selection warning', () => {
  it('warns when submitting with nothing selected', () => {
    const { submit } = renderDrawer();
    submit();
    expect(screen.getByText(EMPTY_SELECTION_WARNING)).toBeInTheDocument();
  });

  it('clears the warning as soon as an annotation is selected', () => {
    const { submit, selectAnnotation } = renderDrawer();
    submit();
    selectAnnotation();
    expect(screen.queryByText(EMPTY_SELECTION_WARNING)).not.toBeInTheDocument();
  });

  it('does not warn again when the selection is cleared after a successful submit', () => {
    const { submit, selectAnnotation } = renderDrawer();
    submit();
    selectAnnotation();
    submit();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Selection' }));
    expect(screen.queryByText(EMPTY_SELECTION_WARNING)).not.toBeInTheDocument();
  });

  it('submits and leaves no warning behind when selecting after the warning', () => {
    const { submit, selectAnnotation, onSubmitted } = renderDrawer();
    submit();
    selectAnnotation();
    submit();
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(EMPTY_SELECTION_WARNING)).not.toBeInTheDocument();
  });
});
