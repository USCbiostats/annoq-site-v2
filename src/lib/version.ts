/**
 * Issue #23. The current AnnoQ release — the one source of truth for it. These
 * read from here:
 *
 * - the home-page banner;
 * - the `<meta name="version">` tag in `index.html`;
 * - `GET /version.json` (`VERSION_INFO_PATH`), which returns `annoqVersionInfo()`
 *   for anything outside the app that needs the running version.
 *
 * The last two are produced by `vite.config.ts`, at build time and by the dev
 * server. A release bump is these two lines plus a matching entry in `releases`
 * in `src/data/staticContent.ts`.
 *
 * Kept free of imports: `vite.config.ts` loads this file under Node, where
 * `import.meta.env` (and so `environment.ts`/`config.ts`) is not available.
 *
 * Not `package.json`'s `version`, which is the npm package version of this
 * client and is not bumped with AnnoQ releases.
 */
export const ANNOQ_VERSION = '2.0-beta.11';
/** ISO 8601 (YYYY-MM-DD), so `/version.json` is machine-readable. */
export const ANNOQ_RELEASE_DATE = '2026-11-04';

export const VERSION_INFO_PATH = '/version.json';

export type AnnoqVersionInfo = { version: string; releaseDate: string };

export function annoqVersionInfo(): AnnoqVersionInfo {
  return { version: ANNOQ_VERSION, releaseDate: ANNOQ_RELEASE_DATE };
}

/**
 * `ANNOQ_RELEASE_DATE` the way the release notes write dates, e.g.
 * "September 4, 2026". UTC throughout: a bare ISO date parses as UTC midnight,
 * which local time would turn into the previous day west of Greenwich.
 */
export function formatReleaseDate(isoDate = ANNOQ_RELEASE_DATE): string {
  return new Date(isoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
