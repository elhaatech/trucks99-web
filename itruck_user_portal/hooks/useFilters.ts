"use client";

import { useCallback, useState } from "react";

export interface UseFiltersReturn<T extends object> {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFiltersPatch: (patch: Partial<T>) => void;
  resetFilters: () => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
}

export function useFilters<T extends object>(initialFilters: T): UseFiltersReturn<T> {
  const initialRef = initialFilters;
  const [filters, setFilters] = useState<T>(() => ({ ...initialFilters }));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);

  const setFiltersPatch = useCallback((patch: Partial<T>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...initialRef });
    setPage(1);
  }, []);

  return {
    filters,
    setFilter,
    setFiltersPatch,
    resetFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
  };
}
