import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getTruckAllWithPagination,
  getCurrentUser,
  getVehicleTypeAll,
  getVehicleBodyTypeAll,
  getUserAll,
  type Truck,
  type User,
  type VehicleType,
  type VehicleBodyType,
  type TruckListPayload,
  getRowId,
} from "@/model/api";
import { useToast } from "@/lib/toast";
import type { SelectOption } from "@/components/common";
import { getVbtId } from "./truckUtils";
import { EMPTY_FILTERS, type TruckFilterState } from "./truckTypes";

type UseTruckDataOptions = {
  /** 1-based page number (matches API convention). Default: 1 */
  page?: number;
  /** Rows per page / API limit. Default: 10 */
  limit?: number;
  /** Column id to sort by (passed from DataTable's onSortChange). */
  sortBy?: string;
  /** Sort direction (passed from DataTable's onSortChange). */
  sortOrder?: "asc" | "desc";
  /**
   * When true, skips the role-based userId filter.
   * Use in FindTruckPage to always fetch all trucks regardless of role.
   * Default: false (TrucksPage — filters by userId when role.status === "user")
   */
  skipUserFilter?: boolean;
};

export function useTruckData({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder,
  skipUserFilter = false,
}: UseTruckDataOptions = {}) {
  const toast = useToast();

  const [items,            setItems]            = useState<Truck[]>([]);
  const [totalCount,       setTotalCount]       = useState(0);
  const [vehicleTypes,     setVehicleTypes]     = useState<VehicleType[]>([]);
  const [vehicleBodyTypes, setVehicleBodyTypes] = useState<VehicleBodyType[]>([]);
  const [users,            setUsers]            = useState<User[]>([]);
  const [currentUser,      setCurrentUser]      = useState<User | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState("");
  const [filters,          setFilters]          = useState<TruckFilterState>(EMPTY_FILTERS);

  // ── Refs: always hold the latest values without stale closures ────────────
  const filterRef         = useRef<TruckFilterState>(EMPTY_FILTERS);
  const pageRef           = useRef(page);
  const limitRef          = useRef(limit);
  const sortByRef         = useRef(sortBy);
  const sortOrderRef      = useRef(sortOrder);
  const toastRef          = useRef(toast);
  const currentUserRef    = useRef<User | null>(null);
  const skipUserFilterRef = useRef(skipUserFilter);
  const refDataLoadedRef  = useRef(false); // tracks whether lookup data has been fetched once

  // Sync every render
  pageRef.current          = page;
  limitRef.current         = limit;
  sortByRef.current        = sortBy;
  sortOrderRef.current     = sortOrder;
  toastRef.current         = toast;
  skipUserFilterRef.current = skipUserFilter;

  // ── updateFilters ─────────────────────────────────────────────────────────
  const updateFilters = useCallback((patch: Partial<TruckFilterState>) => {
    setFilters((prev) => {
      let next = { ...prev, ...patch };

      // Mirrors TruckForm's handleVehicleTypeChange: when vehicleTypeId
      // changes (and vehicleBodyTypeId wasn't explicitly part of this same
      // patch), clear the now-possibly-invalid vehicleBodyTypeId so a stale
      // body type filter from a different vehicle type doesn't linger.
      if (
        "vehicleTypeId" in patch &&
        patch.vehicleTypeId !== prev.vehicleTypeId &&
        !("vehicleBodyTypeId" in patch)
      ) {
        next = { ...next, vehicleBodyTypeId: "" };
      }

      filterRef.current = next;
      return next;
    });
  }, []);

  // ── Dropdown options ───────────────────────────────────────────────────────
  const vehicleTypeOptions: SelectOption[] = useMemo(
    () =>
      vehicleTypes.map((vt) => ({
        value: getRowId(vt) || (vt as any)._id || "",
        label: vt.vehicle_type || (vt as any).name || "",
      })),
    [vehicleTypes]
  );

  // Mirrors TruckForm's logic: if a vehicle type is selected and it has its
  // own `available_body_type` list, show only those body types. Otherwise
  // (no vehicle type selected, or it has no restricted list) fall back to
  // the full flat list of body types.
  const vehicleBodyTypeOptions: SelectOption[] = useMemo(() => {
    const selectedVehicleTypeId = filters.vehicleTypeId?.trim();

    if (selectedVehicleTypeId) {
      const selectedVT = vehicleTypes.find((vt: any) => {
        const vtId = vt.uuid || vt.id || vt._id || getRowId(vt) || "";
        return vtId === selectedVehicleTypeId;
      }) as any;

      if (selectedVT?.available_body_type?.length > 0) {
        return selectedVT.available_body_type
          .filter((vbt: any) => (vbt.vehicle_id || vbt.uuid || vbt.id || vbt._id || "") !== "")
          .map((vbt: any) => ({
            value: vbt.vehicle_id || vbt.uuid || vbt.id || vbt._id || "",
            label: vbt.vehicle_name || "",
          }));
      }
    }

    return vehicleBodyTypes
      .filter((vbt) => getVbtId(vbt) !== "")
      .map((vbt) => ({ value: getVbtId(vbt), label: vbt.vehicle_name ?? "" }));
  }, [filters.vehicleTypeId, vehicleTypes, vehicleBodyTypes]);

  const userOptions: SelectOption[] = useMemo(
    () =>
      users.map((u) => ({
        value: getRowId(u) || (u as any)._id || (u as any).id || "",
        label: (u as any).name || (u as any).email || "",
      })),
    [users]
  );

  // ── buildPayload ───────────────────────────────────────────────────────────
  const buildPayload = useCallback((f: TruckFilterState): TruckListPayload => {
    const payload: TruckListPayload = {
      page:  pageRef.current,
      limit: limitRef.current,
    };

    // Role-based userId filter:
    // - TrucksPage (skipUserFilter=false): "user" role → pass userId (own trucks only)
    // - FindTruckPage (skipUserFilter=true): always skip → fetch all trucks
    if (!skipUserFilterRef.current) {
      const user = currentUserRef.current;
      const roleStatus =
        (user as any)?.role?.status ??
        (user as any)?.roleData?.status;
      if (roleStatus === "user" && user) {
        payload.userId = (user as any)._id ?? (user as any).id;
      }
    }

    // Allow filtering by specific user if provided in filters
    if ((f as any).userId && (f as any).userId.trim() !== "") {
      payload.userId = (f as any).userId.trim();
    }

    // Attach sort params when present
    if (sortByRef.current)    (payload as any).sortBy    = sortByRef.current;
    if (sortOrderRef.current) (payload as any).sortOrder = sortOrderRef.current;

    const hasPickup  = f.pickupAddress.trim()    !== "";
    const hasDrop    = f.dropAddress.trim()       !== "";
    const hasVType   = f.vehicleTypeId.trim()     !== "";
    const hasVBType  = f.vehicleBodyTypeId.trim() !== "";
    const hasVNum    = f.vehicleNumber.trim()     !== "";
    const hasStatus  = f.status.trim()            !== "";
    const hasTStatus = f.truck_status.trim()      !== "";
    const hasLStatus = f.load_status.trim()       !== "";

    // ── Simple top-level filters (always safe, no geo-search involved) ──────
    if (hasVType)   payload.vehicleType     = f.vehicleTypeId.trim();
    if (hasVBType)  payload.vehicleBodyType = f.vehicleBodyTypeId.trim();
    if (hasVNum)    payload.vehicleNumber   = f.vehicleNumber.trim();
    if (hasStatus)  (payload as any).status       = f.status.trim();
    if (hasTStatus) (payload as any).truck_status  = f.truck_status.trim();
    if (hasLStatus) (payload as any).load_status   = f.load_status.trim();

    // ── Geo-search block ──────────────────────────────────────────────────
    // IMPORTANT: only build `search`/`radiusKm` when there is an actual
    // pickup or drop address. Previously this also triggered on
    // hasVType/hasVBType alone, which sent a bare `{ vehicleType }` search
    // entry with no location — that confused the backend's geo-search
    // branch and broke plain "filter by vehicle type" results.
    // Vehicle type/body type are still attached here as narrowing filters
    // *within* a location search, they just don't trigger one on their own.
    if (hasPickup || hasDrop) {
      const searchEntry: NonNullable<TruckListPayload["search"]>[number] = {};

      if (hasPickup) {
        const loc: NonNullable<TruckListPayload["search"]>[number]["pickupLocation"] = {
          address: f.pickupAddress.trim(),
        };
        if (f.pickupLat !== "" && f.pickupLng !== "" && !isNaN(f.pickupLat) && !isNaN(f.pickupLng)) {
          loc.lat = f.pickupLat;
          loc.lng = f.pickupLng;
        }
        searchEntry.pickupLocation = loc;
        searchEntry.routeFrom      = f.pickupAddress.trim();
      }

      if (hasDrop) {
        const loc: NonNullable<TruckListPayload["search"]>[number]["dropLocation"] = {
          address: f.dropAddress.trim(),
        };
        if (f.dropLat !== "" && f.dropLng !== "" && !isNaN(f.dropLat) && !isNaN(f.dropLng)) {
          loc.lat = f.dropLat;
          loc.lng = f.dropLng;
        }
        searchEntry.dropLocation = loc;
        searchEntry.routeTo      = f.dropAddress.trim();
      }

      if (hasVType)  searchEntry.vehicleType     = f.vehicleTypeId.trim();
      if (hasVBType) searchEntry.vehicleBodyType = f.vehicleBodyTypeId.trim();

      payload.search = [searchEntry];
      (payload as any).radiusKm = f.radiusKm ?? 10;
    }

    return payload;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── fetchReferenceData ──────────────────────────────────────────────────
  // Fetches user/vehicle-type/vehicle-body-type/user-list lookup data.
  // This data rarely changes mid-session, so it's only fetched once (on
  // mount) instead of on every page change / filter apply / load() call.
  const fetchReferenceData = useCallback(async () => {
    const [user, vTypes, vBodyTypes, allUsers] = await Promise.all([
      getCurrentUser(),
      getVehicleTypeAll(),
      getVehicleBodyTypeAll(),
      getUserAll(),
    ]);
    setCurrentUser(user);
    currentUserRef.current = user; // sync before buildPayload reads it
    setVehicleTypes(vTypes || []);
    setVehicleBodyTypes(vBodyTypes || []);
    setUsers(allUsers || []);
    refDataLoadedRef.current = true;
    return user;
  }, []);

  // ── fetchTrucks ────────────────────────────────────────────────────────────
  const fetchTrucks = useCallback((f: TruckFilterState) => {
    setLoading(true);
    setError("");

    const ensureRefData = refDataLoadedRef.current
      ? Promise.resolve(currentUserRef.current)
      : fetchReferenceData();

    ensureRefData
      .then(() => {
        const payload = buildPayload(f); // build after user is in ref
        return getTruckAllWithPagination(payload);
      })
      .then((res) => {
        setItems(res.trucks ?? []);
        setTotalCount(res.pagination?.total ?? 0);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load";
        setError(msg);
        toastRef.current.error(msg);
      })
      .finally(() => setLoading(false));
  }, [buildPayload, fetchReferenceData]);

  const fetchTrucksRef = useRef(fetchTrucks);
  fetchTrucksRef.current = fetchTrucks;

  // ── Re-fetch when page, limit, sortBy, or sortOrder change ────────────────
  useEffect(() => {
    fetchTrucksRef.current(filterRef.current);
  }, [page, limit, sortBy, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public: reload with current state ─────────────────────────────────────
  const load = useCallback(() => {
    fetchTrucksRef.current(filterRef.current);
  }, []);

  // ── Public: reset filters and reload ──────────────────────────────────────
  const clearFilters = useCallback(() => {
    const cleared = { ...EMPTY_FILTERS };
    filterRef.current = cleared;
    setFilters(cleared);
    fetchTrucksRef.current(cleared);
  }, []);

  return {
    items,
    totalCount,
    loading,
    error,
    setError,
    vehicleTypes,
    vehicleBodyTypes,
    currentUser,
    users,
    vehicleTypeOptions,
    vehicleBodyTypeOptions,
    userOptions,
    filters,
    updateFilters,
    load,
    clearFilters,
  };
}