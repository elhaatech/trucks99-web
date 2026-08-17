"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentUser, getRoles, getUserAll, type Role, type User } from "@/model/api";
import { useNotification } from "@/hooks/useNotification";
import { EMPTY_FILTERS, type FilterState } from "@/app/admin/portal/user/_components/interface/userTypes";

export interface UserListSyncState {
  filters: FilterState;
  page: number;
  pageSize: number;
}

export function useUserData() {
  const { notify } = useNotification();

  const [loading, setLoading] = useState(true);
  const [rawItems, setRawItems] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  const listStateRef = useRef<UserListSyncState>({
    filters: EMPTY_FILTERS,
    page: 1,
    pageSize: 50,
  });

  const syncListState = useCallback((partial: Partial<UserListSyncState>) => {
    listStateRef.current = { ...listStateRef.current, ...partial };
  }, []);

  const loadAll = useCallback(
    (overrides?: Partial<FilterState>) => {
      setLoading(true);
      setError("");

      const { filters } = listStateRef.current;
      const f = { ...filters, ...(overrides ?? {}) };
      const search = f.search.trim();

      return getUserAll(search ? { search } : undefined)
        .then((res) => setRawItems(res ?? []))
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "Failed to load users";
          setError(msg);
          notify({ type: "error", message: msg });
        })
        .finally(() => setLoading(false));
    },
    [notify]
  );

  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;

  useEffect(() => {
    let cancelled = false;
    Promise.all([getRoles(), getCurrentUser()])
      .then(([rolesRes, userRes]) => {
        if (cancelled) return;
        setRoles(rolesRes ?? []);
        setCurrentUser(userRes ?? null);
      })
      .catch(() => {
        // Keep going even if roles/current user fails; list can still load.
      });

    loadAllRef.current();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    loading,
    error,
    setError,
    rawItems,
    roles,
    currentUser,
    loadAll,
    syncListState,
  };
}

