import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLoadAllWithPagination,
  getVehicleTypeAll,
  getVehicleBodyTypeAll,
  getMaterialAll,
  getCurrentUser,
  getUserAll,
  type Load,
  type VehicleType,
  type VehicleBodyType,
  type Material,
  type User,
} from "@/model/api";
import { useNotification } from "@/hooks/useNotification";
import { EMPTY_FILTERS, type FilterState } from "@/app/admin/portal/load/_components/interface/loadTypes";

export interface LoadListSyncState {
  filters: FilterState;
  page: number;
  pageSize: number;
}

type UseLoadDataOptions = {
  /** 1-based page number (matches API convention). Default: 1 */
  page?: number;
  /** Rows per page / API limit. Default: 10 */
  limit?: number;
  /**
   * When true, skips the role-based userId filter.
   * Use in FindLoadsPage to always fetch all loads regardless of role.
   * Default: false (LoadsPage — filters by userId when role.status === "user")
   */
  skipUserFilter?: boolean;
};

export function useLoadData({ page = 1, limit = 10, skipUserFilter = false }: UseLoadDataOptions = {}) {
  const { notify } = useNotification();
  const [loading,          setLoading]          = useState(true);
  const [rawItems,         setRawItems]         = useState<Load[]>([]);
  const [totalCount,       setTotalCount]       = useState(0);
  const [vehicleTypes,     setVehicleTypes]     = useState<VehicleType[]>([]);
  const [vehicleBodyTypes, setVehicleBodyTypes] = useState<VehicleBodyType[]>([]);
  const [materials,        setMaterials]        = useState<Material[]>([]);
  const [users,            setUsers]            = useState<User[]>([]);
  const [currentUser,      setCurrentUser]      = useState<User | null>(null);
  const [error,            setError]            = useState("");

  const listStateRef = useRef<LoadListSyncState>({
    filters:  EMPTY_FILTERS,
    page:     1,
    pageSize: limit,
  });

  // Ref so loadAll always reads the latest value without stale closure
  const skipUserFilterRef  = useRef(skipUserFilter);
  const currentUserRef     = useRef<User | null>(null);
  skipUserFilterRef.current = skipUserFilter;

  const syncListState = useCallback((partial: Partial<LoadListSyncState>) => {
    listStateRef.current = { ...listStateRef.current, ...partial };
  }, []);

  const loadAll = useCallback(
    (overrides?: Partial<FilterState>) => {
      setLoading(true);
      setError("");

      const { filters } = listStateRef.current;
      const f: FilterState = { ...EMPTY_FILTERS, ...filters, ...(overrides ?? {}) };

      const payload: Parameters<typeof getLoadAllWithPagination>[0] & {
        usearid?: string[];
        loadNumber?: string;
        status?: string[];
      } = {
        page,
        limit,
      };

      // ── Role-based userId filter ─────────────────────────────────────────
      // LoadsPage (skipUserFilter=false): role.status === "user" → pass userId
      // FindLoadsPage (skipUserFilter=true): always skip → fetch all loads
      if (!skipUserFilterRef.current) {
        const user = currentUserRef.current;
        const roleStatus =
          (user as any)?.role?.status ??
          (user as any)?.roleData?.status;
        if (roleStatus === "user" && user) {
          const userId = (user as any)._id ?? (user as any).id;
          if (userId) {
            (payload as any).usearid = [userId];
          }
        }
      }

      // ── User filter (from filters panel) ────────────────────────────────
      // Only apply if role-based filter didn't already set usearid
      if (!(payload as any).usearid) {
        if (Array.isArray(f.userIds) && f.userIds.length > 0) {
          const cleanIds = f.userIds.filter((id) => id?.trim());
          if (cleanIds.length > 0) {
            (payload as any).usearid = cleanIds;
          }
        }
        if ((!Array.isArray(f.userIds) || f.userIds.length === 0) && f.userName?.trim()) {
          payload.userName = f.userName.trim().toLowerCase();
        }
      }

      // ── Load number filter ───────────────────────────────────────────────
      if (f.loadNumber?.trim()) {
        payload.loadNumber = f.loadNumber.trim().toUpperCase();
      }

      // ── Status filter ────────────────────────────────────────────────────
      if (Array.isArray(f.status) && f.status.length > 0) {
        payload.status = f.status;
      }

      // ── Date filters ─────────────────────────────────────────────────────
      if (f.dateFrom?.trim()) payload.dateFrom = f.dateFrom.trim();
      if (f.dateTo?.trim())   payload.dateTo   = f.dateTo.trim();

      // ── Location / vehicle filters ────────────────────────────────────────
      if (
        f.pickup?.trim() ||
        f.drop?.trim() ||
        f.vehicleTypeId?.trim() ||
        f.vehicleBodyTypeId?.trim()
      ) {
        const searchEntry: NonNullable<NonNullable<typeof payload.search>>[number] = {};
        if (f.pickup?.trim())            searchEntry.pickupLocation  = { address: f.pickup.trim() };
        if (f.drop?.trim())              searchEntry.dropLocation    = { address: f.drop.trim() };
        if (f.vehicleTypeId?.trim())     searchEntry.vehicleType     = f.vehicleTypeId.trim();
        if (f.vehicleBodyTypeId?.trim()) searchEntry.vehicleBodyType = f.vehicleBodyTypeId.trim();
        payload.search = [searchEntry];
      }

      getLoadAllWithPagination(payload)
        .then((res) => {
          setRawItems(res.loads ?? []);
          setTotalCount(res.pagination?.total ?? 0);
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "Failed to load loads";
          setError(msg);
          notify({ type: "error", message: msg });
        })
        .finally(() => setLoading(false));
    },
    [page, limit, notify]
  );

  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;

  // Re-fetch whenever page or limit changes; also acts as initial load
  useEffect(() => {
    loadAllRef.current();
  }, [page, limit]);

  // One-time fetch of reference data + current user
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getVehicleTypeAll(),
      getVehicleBodyTypeAll(),
      getMaterialAll(),
      getCurrentUser(),
      getUserAll(),
    ]).then(([vTypes, vBodyTypes, mats, user, userList]) => {
      if (cancelled) return;
      setVehicleTypes(vTypes || []);
      setVehicleBodyTypes(vBodyTypes || []);
      setMaterials(mats || []);
      setCurrentUser(user ?? null);
      currentUserRef.current = user ?? null; // sync ref for loadAll
      setUsers(userList || []);
      // Re-fetch loads now that we have the user (role-based filter may apply)
      loadAllRef.current();
    });
    return () => { cancelled = true; };
  }, []);

  return {
    loading,
    error,
    setError,
    rawItems,
    totalCount,
    vehicleTypes,
    vehicleBodyTypes,
    materials,
    users,
    currentUser,
    loadAll,
    syncListState,
  };
}