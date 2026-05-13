import { describe, expect, it } from 'vitest';
import { buildAnnotationStore } from './annotations';
import { buildPageQuery, buildRequest } from './queryBuilder';
import type { Annotation } from '../types';

const store = buildAnnotationStore([
  { id: 1, name: 'root', label: 'Root', leaf: false },
  { id: 3, name: 'rs_dbSNP', label: 'rsID', parent_id: 1, leaf: true },
  { id: 2, name: 'custom_name', api_field: 'CUSTOM_API', label: 'Custom', parent_id: 1, leaf: true }
] as Annotation[]);

describe('query builder', () => {
  it('builds chromosome queries with selected API fields', () => {
    const request = buildRequest(
      'chromosome',
      { chrom: '18', start: '1', end: '500000', geneProduct: '', rsID: '', rsIDList: '', vcf: '', keyword: '' },
      ['custom_name'],
      [],
      store
    );
    const query = buildPageQuery(request, 1, store);
    expect(query).toContain('count_SNPs_by_chromosome');
    expect(query).toContain('CUSTOM_API');
    expect(query).toContain('query_type_option: SNPS');
  });

  it('builds each supported query mode', () => {
    const values = {
      chrom: '18',
      start: '1',
      end: '10',
      geneProduct: 'ZMYND11',
      rsID: 'rs1',
      rsIDList: 'rs1\nrs2',
      vcf: 'chr1\t10\t.\tA\tG',
      keyword: 'Signaling by GPCR'
    };
    expect(buildPageQuery(buildRequest('geneProduct', values, ['custom_name'], [], store), 1, store)).toContain('get_SNPs_by_gene_product');
    expect(buildPageQuery(buildRequest('rsID', values, ['custom_name'], [], store), 1, store)).toContain('get_SNPs_by_RsID');
    expect(buildPageQuery(buildRequest('rsIDList', values, ['custom_name'], [], store), 1, store)).toContain('rsIDs: ["rs1","rs2"]');
    expect(buildPageQuery(buildRequest('vcf', values, ['custom_name'], [], store), 1, store)).toContain('ids: ["1:10A>G"]');
    expect(buildPageQuery(buildRequest('keyword', values, ['custom_name'], [], store), 1, store)).toContain('keyword: "Signaling by GPCR"');
  });

  it('uses the rsID field discovered from annotations', () => {
    const request = buildRequest(
      'chromosome',
      { chrom: '18', start: '1', end: '10', geneProduct: '', rsID: '', rsIDList: '', vcf: '', keyword: '' },
      [],
      [],
      store
    );
    expect(request.fields).toContain('rs_dbSNP');
    expect(request.fields).not.toContain('rs_dbSNP151');
  });
});
