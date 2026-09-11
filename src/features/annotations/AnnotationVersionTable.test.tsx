import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildAnnotationStore } from '../../lib/annotations';
import type { Annotation } from '../../types';
import { AnnotationVersionTable } from './AnnotationVersionTable';

// Same shape as VersionPage.test.tsx: a second top-level tool arrives before the
// first tool's children, so response order and tree order disagree.
const store = buildAnnotationStore([
  { id: '1', name: 'ANNOVAR', leaf: false, version: 'v1' },
  { id: '2', name: 'VEP', leaf: false, version: 'v2' },
  { id: '3', name: 'ANNOVAR gene', parent_id: '1', leaf: true, version: 'v1a' },
  { id: '4', name: 'VEP consequence', parent_id: '2', leaf: true, version: 'v2a' },
  { id: '5', name: 'no version here', parent_id: '1', leaf: true }
] as Annotation[]);

function toolNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.querySelectorAll('td')[0]?.textContent);
}

describe('AnnotationVersionTable', () => {
  it('lists tools in annotation-tree order', () => {
    render(<AnnotationVersionTable tree={store.tree} />);
    expect(toolNames()).toEqual(['ANNOVAR', 'ANNOVAR gene', 'VEP', 'VEP consequence']);
  });

  it('omits annotations that carry no version', () => {
    render(<AnnotationVersionTable tree={store.tree} />);
    expect(screen.queryByText('no version here')).toBeNull();
  });

  it('prefers the label over the raw name when one is present', () => {
    const labelled = buildAnnotationStore([
      { id: '1', name: 'raw_name', label: 'Readable Name', leaf: true, version: 'v9' }
    ] as Annotation[]);
    render(<AnnotationVersionTable tree={labelled.tree} />);
    expect(screen.getByText('Readable Name')).toBeInTheDocument();
    expect(screen.queryByText('raw_name')).toBeNull();
  });

  it('credits the WGSA build', () => {
    render(<AnnotationVersionTable tree={store.tree} />);
    expect(screen.getByRole('link', { name: 'WGSA' })).toHaveAttribute(
      'href',
      'https://sites.google.com/site/jpopgen/wgsa'
    );
  });
});
