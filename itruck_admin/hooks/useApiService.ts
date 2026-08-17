"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseApiServiceReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Wraps an async service call with loading / error state. Pass a stable service function reference.
 */
export function useApiService<T>(
  serviceFunction: (...args: unknown[]) => Promise<T>,
  autoFetch: boolean | unknown[] = false
): UseApiServiceReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fnRef = useRef(serviceFunction);
  fnRef.current = serviceFunction;

  const execute = useCallback(async (...args: unknown[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(...args);
      setData(result);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (autoFetch === false || autoFetch === undefined) return;
    const args = Array.isArray(autoFetch) ? autoFetch : [];
    void execute(...args);
    // Intentionally mount-only when autoFetch is enabled (avoid unstable [] deps from callers).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, execute, reset };
}
