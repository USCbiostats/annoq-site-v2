# Search Window Scroll — Design

Resolves [#3](https://github.com/USCbiostats/annoq-site-v2/issues/3): *"In search window, vertical window scroll is above vertical scroll for results table"*

Branch: `issue-3-search-window-scroll`
Date: 2026-08-13
Status: implemented, verified in Firefox, Chrome and Edge

## Problem

Reported against Firefox, chromosome search with default parameters and both Annovar and basic options selected:

> When results are displayed, horizontal scroll for results is visible. Immediately, vertical scroll is also visible. After scrolling, window scroll is above horizontal scroll. Only way to scroll through the table results is via mouse.

The reporter confirmed the symptom does not appear in Chrome or Edge. The fix must nonetheless be correct in all modern browsers rather than a Firefox-targeted workaround.

## Root cause

### The stray window scrollbar

The search page derived its height by subtracting an assumed AppBar height:

| Location | Declaration |
| --- | --- |
| `src/styles.css` | `.main-appbar { border-bottom: 1px solid #d5deea; }` |
| `src/styles.css` | `.main-toolbar { min-height: 60px !important; }` |
| `src/styles.css` | `.search-shell { height: calc(100vh - 60px); }` |

The sticky AppBar occupies **61px** — 60px of toolbar plus its 1px bottom border — but `.search-shell` subtracted only 60px, making the document permanently `100vh + 1px` tall.

That 1px overflow exists in every browser. Gecko paints a window scrollbar for it; Blink's layout rounding at typical fractional device-pixel ratios absorbs it. Hence the Firefox-only report.

A 1px window scrollbar is disproportionately harmful here: it can only scroll one pixel, yet its presence shrinks the viewport and pushes the results table's horizontal scrollbar below the fold, leaving the mouse wheel as the only way through the results.

### The hidden second half

Removing that `calc()` is necessary but not sufficient, and this was only discovered during implementation. The old declaration was also the **only definite height in the chain**, and three children of `.result-area` depended on one existing:

| Location | Declaration |
| --- | --- |
| `src/styles.css` | `.results-view { height: 100%; }` |
| `src/styles.css` | `.panel { height: 100%; }` |
| `src/styles.css` | `.empty-state { height: 100%; }` |

Once `.search-shell` is sized by `flex: 1` rather than an explicit `calc()`, `.result-area` becomes a block container whose height is flex-resolved, and Gecko does not treat that as definite for percentage children the way Blink does. In Firefox the percentages collapse, the panel grows to fit its content, `.simple-results-table-wrap` never overflows, and `.app-shell--locked { overflow: hidden }` clips the excess — leaving **no scrollbars at all**, in any panel. Chrome and Edge resolve the percentages and show nothing wrong, so this failure is invisible outside Firefox.

The chain must therefore be sized by flex at every level, with no percentage heights between the locked shell and the scroll container.

### Keyboard access

The final symptom is independent of layout. `.simple-results-table-wrap` (`src/features/search/ResultsTable.tsx`) was a plain `div` with `overflow: auto` and no `tabIndex`, so it could not take keyboard focus. Firefox makes scrollable containers focusable on its own; Chrome and Safari do not.

## Approach

Remove the arithmetic rather than correct it. Changing `60px` to `61px` would fix Firefox today and silently rot the next time anyone edits the AppBar's border or padding.

The app shell owns the viewport, the AppBar takes what it needs, and every level below is sized by flex:

```
.app-shell                    display:flex; flex-direction:column; min-height:100dvh
├── .main-appbar              flex:0 0 auto      ← measured, never assumed
└── <Routes>
    └── .search-shell         flex:1; min-height:0; overflow:hidden
        └── .search-main      flex:1; display:flex; flex-direction:column
            └── .result-area  flex:1; min-height:0; display:flex; flex-direction:column
                └── .results-view / .panel / .empty-state    flex:1; min-height:0
                    └── .simple-results-table-wrap   overflow:auto  ← the ONLY scroller
```

On `/search` the shell additionally gets `height: 100dvh; overflow: hidden`, so the page cannot exceed the viewport regardless of toolbar height, font size or zoom. On every other route it stays `min-height: 100dvh` and scrolls normally, leaving Home, Docs and the Footer untouched.

The two `Drawer` components are portalled to `<body>` and fixed-positioned, so they cannot participate in that flex chain. They receive the AppBar's real height through a `--annoq-appbar-h` custom property, written from a `ResizeObserver` inside a `useLayoutEffect` using `getBoundingClientRect().height` for sub-pixel accuracy under browser zoom.

Rejected alternatives:

- **Drive the existing `calc()` from a measured variable.** Smaller diff, but keeps the search page coupled to a subtraction that must stay in sync with the AppBar forever, and remains vulnerable to sub-pixel rounding at fractional zoom.
- **Single page scrollbar.** Dropping the table's internal scroll gives one genuine scrollbar but breaks the sticky header row and pinned columns, and strands the horizontal scrollbar at the bottom of a very long page.

## Changes

### `src/styles.css`

- Added `:root { --annoq-appbar-h: 60px; }` as the first-paint fallback.
- `.app-shell` is a flex column with `min-height: 100vh; min-height: 100dvh` (fallback pair).
- Added `.app-shell--locked` with `height: 100vh; height: 100dvh; min-height: 0; overflow: hidden;`.
- `.search-shell` is now `flex: 1; min-height: 0`, **deleting `height: calc(100vh - 60px)`**.
- `.result-area` is now a column flex container, and `.results-view`, `.panel` and `.empty-state` are sized by `flex: 1; min-height: 0` when they sit inside it, replacing their reliance on `height: 100%`.
- `.query-drawer` and `.side-drawer` use `top: var(--annoq-appbar-h)` and `height: calc(100% - var(--annoq-appbar-h))`, replacing both `60px` literals.
- `.simple-results-table-wrap` gained `overscroll-behavior: contain` and a `:focus-visible` outline.

### `src/App.tsx`

- Hoisted the existing `location.pathname === '/search'` test into `isSearch`, used for both the Footer and the `app-shell--locked` class.
- Added a `useAppBarHeight` hook: a ref on the AppBar, a `ResizeObserver` writing `--annoq-appbar-h` onto `document.documentElement`, disconnected on unmount.

### `src/features/search/ResultsTable.tsx`

- The `.simple-results-table-wrap` element gained `tabIndex={0}`, `role="region"` and `aria-label="Search results table"`.

## Keyboard access

No JavaScript key handling. Once the scroll container is focusable, arrow keys, PageUp/PageDown, Home/End and Space scroll it natively and identically in Gecko, Blink and WebKit. A custom `onKeyDown` would duplicate native behaviour, interfere with scroll momentum, and disrupt screen-reader virtual cursors. The fix is three attributes and a focus ring.

`role="region"` with an accessible name also exposes the results as a navigable landmark, which is the ARIA Authoring Practices recommendation for a scrollable region.

## Out of scope

- Result rows are `<tr onClick>` (`ResultsTable.tsx`) with no keyboard equivalent. That is row *selection*, not scrolling, so it is not what #3 reports. It should be filed as a separate accessibility issue.
- The fixed chrome inside the search page — toolbar, results header and pager — totals roughly 160px and none of it shrinks. Below that viewport height the scroll container is squeezed to zero and the results become unreachable. This predates the change (the old `calc(100vh - 60px)` squeezed identically) and is not part of #3, but it is a real defect worth its own issue.

## Edge cases

- **`100dvh` support.** Baseline in Firefox 101, Chrome 108 and Safari 15.4, and paired with a `100vh` fallback declaration. It also fixes the mobile URL-bar variant of this same bug, which `100vh` causes on every mobile browser.
- **First paint.** The `60px` variable fallback covers the frame before measurement, though `useLayoutEffect` should complete before paint.
- **Fractional zoom.** Measuring with `getBoundingClientRect()` means sub-pixel AppBar heights under 125%/150% display scaling flow through to the drawers exactly, instead of being rounded.
- **Flex chain integrity.** `.search-shell` must be a direct flex child of `.app-shell`. Verified: `SearchProvider` and `AnnotationSelectionProvider` render bare context providers, and `<Routes>` emits no DOM wrapper.
- **Shared `.result-area` children.** `.panel` is also used inside the right-hand drawer, where its parent is not a flex container. It keeps `height: 100%` for that context; the `flex: 1` sizing is scoped to children of `.result-area`, so the two contexts do not interfere.

## Verification

### Diagnostic technique

Layout faults of this kind are not visible from the CSS alone. The chain was diagnosed by dumping, for each level from `.app-shell` down to the table, the measured height, `scrollHeight`, `clientHeight`, computed height, flex-grow/basis and `overflow-y`. The level where `scrollHeight` exceeds `clientHeight` without a scrollbar, or where a flex item reports `flex-grow: 0`, identifies the break.

One caveat learned the hard way: **devtools docked to the bottom of the window shrinks the viewport**, and `dvh` correctly reports the reduced height. Measurements taken that way understate every height in the chain and will send the analysis in the wrong direction. Detach devtools into its own window before measuring.

### Manual, browser-driven

No browser is installed in the WSL2 development environment, so `npm run dev` is started locally and the pages are exercised from the host browser.

Confirmed after the fix:

- Firefox: no window scrollbar; the results table scrolls in both axes; Summary and Stats panels scroll; keyboard scrolling works.
- Chrome and Edge: unchanged and correct.
- Non-search routes still scroll normally and still render the Footer.

### Automated (vitest + existing React Testing Library setup)

- `/search` renders `app-shell--locked`; other routes do not.
- The results table wrap exposes `tabIndex=0` and an accessible name.
- A guard on the first fault: `src/styles.css` contains no `calc(100vh - 60px)`, and the `.query-drawer` and `.side-drawer` offsets reference `var(--annoq-appbar-h)` rather than a pixel literal.
- A guard on the second fault: `.result-area` declares `display: flex` with `flex-direction: column`, and each panel it can render — `.results-view`, `.panel`, `.empty-state` — is given `flex: 1; min-height: 0` there. A new panel added without flex sizing fails this test.

Both guards parse the stylesheet into selector/declaration pairs with comments stripped, so grouped rules stay queryable by any one of their members.

jsdom has no layout engine and cannot assert the pixel behaviour; the browser pass is what proves the fix. These tests exist to stop the regression class returning — particularly the second fault, which no Chrome or Edge check can catch.

The second guard was mutation-tested: reverting `.result-area` to its pre-fix form makes four of its assertions fail, so it is known to detect the regression rather than merely to pass.
