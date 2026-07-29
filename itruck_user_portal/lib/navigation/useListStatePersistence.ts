"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { clearListState, loadListState, saveListState } from "./navigation";

export function useListStatePersistence<T extends object>(defaultState: T) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageKey = pathname + (searchParams.toString() ? `?${searchParams}` : "");
  const restoredRef = useRef(false);

  const restore = useCallback((): Partial<T> | null => {
    return loadListState<Partial<T>>(storageKey);
  }, [storageKey]);

  const save = useCallback(
    (state: T) => {
      saveListState(storageKey, state);
    },
    [storageKey],
  );

  const clear = useCallback(() => {
    clearListState(storageKey);
  }, [storageKey]);

  return {
    storageKey,
    defaultState,
    restoredRef,
    restore,
    save,
    clear,
  };
}

/**
 * Persist list UI state (filters, pagination, etc.) across forward/back navigation.
 */
export function usePersistListState<T extends object>(state: T, enabled = true) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageKey = pathname + (searchParams.toString() ? `?${searchParams}` : "");

  useEffect(() => {
    if (!enabled) return;
    saveListState(storageKey, state);
  }, [enabled, storageKey, state]);
}
