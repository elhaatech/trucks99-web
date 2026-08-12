"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "@/lib/apiCache";

export interface InfiniteScrollResult<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
}

export interface UseInfiniteScrollOptions {
  enabled?: boolean;
  rootMargin?: string;
}

export interface UseInfiniteScrollReturn<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  page: number;
  total: number;
  totalPages: number;
  sentinelRef: (node: HTMLDivElement | null) => void;
  reset: () => void;
}

export function useInfiniteScroll<T>(
  loadPage: (page: number, signal: AbortSignal) => Promise<InfiniteScrollResult<T>>,
  options?: UseInfiniteScrollOptions,
): UseInfiniteScrollReturn<T> {
  const { enabled = true, rootMargin = "300px" } = options ?? {};

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const loadPageRef = useRef(loadPage);
  loadPageRef.current = loadPage;

  /** Bumps when filters/sort change — stale in-flight responses must not clear loading. */
  const requestGenRef = useRef(0);

  const stateRef = useRef({ loading: false, loadingMore: false, hasMore: true, page: 1, totalPages: 1 });
  stateRef.current = { loading, loadingMore, hasMore, page, totalPages };

  const fetchPage = useCallback(
    async (pageNum: number, isMore: boolean, signal?: AbortSignal, gen?: number) => {
      const activeGen = gen ?? requestGenRef.current;

      if (isMore) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await loadPageRef.current(pageNum, signal ?? new AbortController().signal);
        if (signal?.aborted || activeGen !== requestGenRef.current) return;

        const newItems = result.items ?? [];
        setItems((prev) => (isMore ? [...prev, ...newItems] : newItems));
        setTotal(result.total ?? newItems.length);
        setTotalPages(result.totalPages ?? 1);
        setPage(result.page ?? pageNum);
        setHasMore((result.page ?? pageNum) < (result.totalPages ?? 1));
      } catch (err) {
        if (
          signal?.aborted ||
          activeGen !== requestGenRef.current ||
          isAbortError(err)
        ) {
          return;
        }
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (activeGen !== requestGenRef.current) return;
        if (isMore) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const gen = ++requestGenRef.current;
    abortCtrlRef.current?.abort();
    setItems([]);
    setHasMore(true);
    setPage(1);
    setTotal(0);
    setTotalPages(1);
    setError(null);
    setLoading(true);
    setLoadingMore(false);

    const controller = new AbortController();
    abortCtrlRef.current = controller;
    void fetchPage(1, false, controller.signal, gen);

    return () => {
      controller.abort();
    };
  }, [enabled, loadPage, fetchPage]);

  useEffect(() => {
    if (!sentinelNode || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;

        const { loading, loadingMore, hasMore, page, totalPages } = stateRef.current;
        if (loadingMore || loading || !hasMore) return;
        if (page >= totalPages) return;

        void fetchPage(page + 1, true);
      },
      { root: null, rootMargin, threshold: 0 },
    );

    observer.observe(sentinelNode);
    return () => observer.disconnect();
  }, [sentinelNode, enabled, fetchPage, rootMargin]);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinelNode(node);
  }, []);

  const reset = useCallback(() => {
    const gen = ++requestGenRef.current;
    abortCtrlRef.current?.abort();
    setItems([]);
    setHasMore(true);
    setPage(1);
    setTotal(0);
    setTotalPages(1);
    setError(null);
    setLoading(true);
    setLoadingMore(false);

    const controller = new AbortController();
    abortCtrlRef.current = controller;
    void fetchPage(1, false, controller.signal, gen);
  }, [fetchPage]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    page,
    total,
    totalPages,
    sentinelRef,
    reset,
  };
}
