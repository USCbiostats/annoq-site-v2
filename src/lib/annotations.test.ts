import { describe, expect, it } from 'vitest';
import type { Annotation } from '../types';
import { apiFieldFor, buildAnnotationStore, collectLeafNames, nameForApiField } from './annotations';

const annotations = [
  { id: 1, name: 'root', leaf: false },
  { id: 3, parent_id: 1, name: 'rs_dbSNP', leaf: true },
  { id: 2, parent_id: 1, name: 'child', api_field: 'CHILD_API', leaf: true }
] as Annotation[];

describe('annotations', () => {
  it('builds normalized lookup and tree', () => {
    const store = buildAnnotationStore(annotations);
    expect(store.tree[0].children.map((child) => child.name)).toContain('child');
    expect(apiFieldFor('child', store)).toBe('CHILD_API');
    expect(nameForApiField('CHILD_API', store)).toBe('child');
    expect(collectLeafNames(store.tree[0])).toEqual(['rs_dbSNP', 'child']);
    expect(store.leafNamesByName.root).toEqual(['rs_dbSNP', 'child']);
    expect(store.rsidField).toBe('rs_dbSNP');
  });
});
