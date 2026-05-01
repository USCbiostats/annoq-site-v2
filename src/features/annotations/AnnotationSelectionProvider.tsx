import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'annoq:selectedAnnotations';

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
      return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
    } catch {
      return [];
    }
  });

  const setSelected = useCallback((next: string[]) => {
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
