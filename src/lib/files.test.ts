import { describe, expect, it } from 'vitest';
import { parseConfig, parseRsidList, parseVcfIds } from './files';

describe('file parsers', () => {
  it('parses rsID lists and ignores comments', () => {
    expect(parseRsidList('# comment\nrs1\n\n rs2 ')).toEqual(['rs1', 'rs2']);
  });

  it('parses VCF rows into backend ids', () => {
    expect(parseVcfIds('# header\nchr1\t10\t.\tA\tG')).toEqual(['1:10A>G']);
  });

  it('parses config files', () => {
    expect(parseConfig('{ "_source": ["a", "b"] }')).toEqual(['a', 'b']);
  });
});
