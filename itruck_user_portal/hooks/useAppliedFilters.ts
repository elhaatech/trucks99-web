"use client";

import { useCallback, useState } from "react";

/**
 * Separates draft filter UI state from applied filters that drive API fetches.
 * Prevents list APIs from firing on every keystroke while the user edits filters.
 */
export function useAppliedFilters<T extends object>(initial: T) {
  const [draft, setDraft] = useState<T>(() => ({ ...initial }));
  const [applied, setApplied] = useState<T>(() => ({ ...initial }));

  const patchDraft = useCallback((patch: Partial<T>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyDraft = useCallback(() => {
    setApplied({ ...draft });
  }, [draft]);

  const resetAll = useCallback((next: T) => {
    setDraft({ ...next });
    setApplied({ ...next });
  }, []);

  return {
    draft,
    setDraft,
    patchDraft,
    applied,
    setApplied,
    applyDraft,
    resetAll,
  };
}
