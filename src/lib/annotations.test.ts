import { describe, expect, it } from 'vitest';
import type { Annotation } from '../types';
import { apiFieldFor, buildAnnotationStore, collectLeafNames, nameForApiField } from './annotations';

const annotations = [
  { id: 1, name: 'root', leaf: false },
  { id: 2, parent_id: 1, name: 'child', api_field: 'CHILD_API', leaf: true }
] as Annotation[];

describe('annotations', () => {
  it('builds normalized lookup and tree', () => {
    const store = buildAnnotationStore(annotations);
    expect(store.tree[0].children[0].name).toBe('child');
    expect(apiFieldFor('child', store)).toBe('CHILD_API');
    expect(nameForApiField('CHILD_API', store)).toBe('child');
    expect(collectLeafNames(store.tree[0])).toEqual(['child']);
    expect(store.leafNamesByName.root).toEqual(['child']);
  });
});
