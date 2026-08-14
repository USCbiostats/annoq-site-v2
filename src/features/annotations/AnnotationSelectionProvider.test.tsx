import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnnotationSelectionProvider, useAnnotationSelection } from './AnnotationSelectionProvider';

const STORAGE_KEY = 'annoq:selectedAnnotations';

// Issue #4: chr and pos identify the variant and are always sent, so they are an
// invariant of the shared selection rather than a special case in the query
// builder. Enforcing it on the single write point every consumer already uses --
// the tree, both "Clear Selection" buttons, both config uploads, and the #9
// seeding effect -- is what keeps the tree, the query, storage and the exported
// config from disagreeing.
function Harness({ next }: { next: string[] }) {
  const { selected, setSelected } = useAnnotationSelection();
  return (
    <>
      <output data-testid="selection">{selected.join(',')}</output>
      <button onClick={() => setSelected(next)}>apply</button>
    </>
  );
}

function renderHarness(next: string[] = []) {
  render(
    <AnnotationSelectionProvider>
      <Harness next={next} />
    </AnnotationSelectionProvider>
  );
  return screen.getByTestId('selection');
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('locked annotation selection', () => {
  it('keeps chr and pos when the selection is cleared', () => {
    const probe = renderHarness([]);
    fireEvent.click(screen.getByRole('button', { name: 'apply' }));
    expect(probe.textContent).toBe('chr,pos');
  });

  it('adds chr and pos to a selection that omits them', () => {
    const probe = renderHarness(['ANNOVAR_ensembl_Effect']);
    fireEvent.click(screen.getByRole('button', { name: 'apply' }));
    expect(probe.textContent).toBe('chr,pos,ANNOVAR_ensembl_Effect');
  });

  it('restores chr and pos to a selection stored before they were locked', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['ANNOVAR_ensembl_Effect']));
    expect(renderHarness().textContent).toBe('chr,pos,ANNOVAR_ensembl_Effect');
  });

  // Column order follows request.fields, so normalising chr/pos to the front
  // here is what keeps them as the leading columns without a second rule in the
  // results table.
  it('orders chr and pos first even when they were selected last', () => {
    const probe = renderHarness(['ANNOVAR_ensembl_Effect', 'pos', 'chr']);
    fireEvent.click(screen.getByRole('button', { name: 'apply' }));
    expect(probe.textContent).toBe('chr,pos,ANNOVAR_ensembl_Effect');
  });

  it('persists the locked names so a reload does not lose them', () => {
    renderHarness(['ANNOVAR_ensembl_Effect']);
    fireEvent.click(screen.getByRole('button', { name: 'apply' }));
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([
      'chr',
      'pos',
      'ANNOVAR_ensembl_Effect'
    ]);
  });
});
