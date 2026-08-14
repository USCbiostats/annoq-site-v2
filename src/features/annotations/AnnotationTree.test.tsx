import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { useState } from 'react';
import { buildAnnotationStore } from '../../lib/annotations';
import type { Annotation } from '../../types';
import { AnnotationTree } from './AnnotationTree';

const annotations = [
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

const store = buildAnnotationStore(annotations);

// The tree is virtualized. jsdom reports every element as zero-sized, so the
// virtualizer would render no rows at all and every assertion below would pass
// vacuously. Give elements a height so real rows mount.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 400 });
});

function Harness({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState(initial);
  return (
    <>
      <output data-testid="selection">{selected.join(',')}</output>
      <AnnotationTree store={store} selected={selected} onSelectedChange={setSelected} />
    </>
  );
}

function renderTree(initial: string[]) {
  render(<Harness initial={initial} />);
  return screen.getByTestId('selection');
}

function rowCheckbox(name: string): HTMLInputElement {
  const row = screen.getByText(name).closest('.annotation-virtual-row');
  if (!row) throw new Error(`no tree row rendered for ${name}`);
  return within(row as HTMLElement).getByRole('checkbox') as HTMLInputElement;
}

const allBasic = ['chr', 'pos', 'ref', 'alt', 'rs_dbSNP151'];

describe('locked annotations in the tree', () => {
  it('renders chr and pos as checked and not deselectable', () => {
    renderTree(allBasic);
    expect(rowCheckbox('chr')).toBeChecked();
    expect(rowCheckbox('chr')).toBeDisabled();
    expect(rowCheckbox('pos')).toBeChecked();
    expect(rowCheckbox('pos')).toBeDisabled();
  });

  it('leaves ref, alt and the rsID field deselectable', () => {
    renderTree(allBasic);
    expect(rowCheckbox('ref')).toBeEnabled();
    expect(rowCheckbox('alt')).toBeEnabled();
    expect(rowCheckbox('rs ID')).toBeEnabled();
  });

  it('ignores a click on a locked row', () => {
    const probe = renderTree(allBasic);
    fireEvent.click(screen.getByText('chr'));
    expect(probe.textContent).toBe(allBasic.join(','));
  });

  // Issue #4 asks for chr/pos to survive deselection. The parent node is the
  // path that would otherwise strip them wholesale.
  it('keeps chr and pos when the Basic Info parent is toggled off', () => {
    const probe = renderTree(allBasic);
    fireEvent.click(screen.getByText('Basic Info'));
    expect(probe.textContent).toBe('chr,pos');
  });

  it('shows Basic Info as indeterminate once only the locked fields remain', () => {
    renderTree(['chr', 'pos']);
    const parent = rowCheckbox('Basic Info');
    expect(parent).not.toBeChecked();
    expect(parent).toHaveAttribute('data-indeterminate', 'true');
  });

  it('still toggles an ordinary annotation both ways', () => {
    const probe = renderTree(['chr', 'pos']);
    fireEvent.click(screen.getByText('ANNOVAR_ensembl_Effect'));
    expect(probe.textContent).toBe('chr,pos,ANNOVAR_ensembl_Effect');
    fireEvent.click(screen.getByText('ANNOVAR_ensembl_Effect'));
    expect(probe.textContent).toBe('chr,pos');
  });
});
