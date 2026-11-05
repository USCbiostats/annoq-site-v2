import { UCSC_URL } from './config';

/**
 * The UCSC assembly in an api-v2 genome build: "GRCh37/hg19" -> "hg19",
 * "GRCh38/hg38" -> "hg38". Undefined when the build is unknown or names no hgNN
 * assembly, so callers can leave the position unlinked rather than guess.
 *
 * The assembly used to be hardcoded as db=hg38 here, which sent HRC positions
 * (GRCh37/hg19) to the wrong place in the genome without any error from UCSC.
 */
export function ucscAssembly(genomeBuild: string | null | undefined): string | undefined {
  return genomeBuild?.match(/\bhg\d+\b/i)?.[0].toLowerCase();
}

/** UCSC Genome Browser at a single base, e.g. chr1:12345-12345 on hg19. */
export function ucscPositionUrl(assembly: string, chr: string, pos: string): string {
  const url = new URL(UCSC_URL);
  url.searchParams.set('db', assembly);
  url.searchParams.set('position', `chr${chr}:${pos}-${pos}`);
  return url.toString();
}
