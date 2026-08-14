import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LOCKED_ANNOTATION_NAMES } from '../../lib/config';

const STORAGE_KEY = 'annoq:selectedAnnotations';

/**
 * Every consumer writes the selection through this provider — the annotation
 * tree, both "Clear Selection" buttons, both config uploads, and the default
 * seeding effect — so applying the locked names here is what guarantees the
 * tree, the GraphQL query, storage and the exported config agree. Issue #4 was
 * exactly that disagreement: the query builder added columns the tree said were
 * unselected.
 *
 * Locked names are normalised to the front because column order follows
 * `request.fields`; doing it here keeps chr/pos leading without a second rule in
 * the results table.
 */
function withLocked(names: string[]): string[] {
  return [...LOCKED_ANNOTATION_NAMES, ...names.filter((name) => !LOCKED_ANNOTATION_NAMES.includes(name))];
}

type AnnotationSelectionContextValue = {
  selected: string[];
  setSelected: (selected: string[]) => void;
};

const AnnotationSelectionContext = createContext<AnnotationSelectionContextValue | null>(null);

export function AnnotationSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelectedState] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      // Selections stored before chr/pos were locked are corrected on load, so
      // the tree never disagrees with the query for a session.
      return withLocked(Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : []);
    } catch {
      return withLocked([]);
    }
  });

  const setSelected = useCallback((incoming: string[]) => {
    const next = withLocked(incoming);
    setSelectedState((previous) => {
      if (previous.length === next.length && previous.every((item, index) => item === next[index])) {
        return previous;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ selected, setSelected }), [selected, setSelected]);
  return <AnnotationSelectionContext.Provider value={value}>{children}</AnnotationSelectionContext.Provider>;
}

export function useAnnotationSelection() {
  const context = useContext(AnnotationSelectionContext);
  if (!context) {
    throw new Error('useAnnotationSelection must be used inside AnnotationSelectionProvider');
  }
  return context;
}
