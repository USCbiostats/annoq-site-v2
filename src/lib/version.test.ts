import { describe, expect, it } from 'vitest';
import { ANNOQ_RELEASE_DATE, ANNOQ_VERSION, annoqVersionInfo, formatReleaseDate } from './version';

describe('annoqVersionInfo (issue #23)', () => {
  it('returns the current version and its ISO release date', () => {
    expect(annoqVersionInfo()).toEqual({ version: ANNOQ_VERSION, releaseDate: ANNOQ_RELEASE_DATE });
    expect(ANNOQ_RELEASE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatReleaseDate', () => {
  it('writes dates the way the release notes do', () => {
    expect(formatReleaseDate('2026-09-04')).toBe('September 4, 2026');
  });

  it('does not shift to the previous day in timezones west of UTC', () => {
    // UTC midnight on Jan 1 is still Dec 31 in local time anywhere in the Americas.
    expect(formatReleaseDate('2026-01-01')).toBe('January 1, 2026');
  });
});
