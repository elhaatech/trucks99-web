import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentUser,
  getIncomeExpenseAll,
  getLoadAllWithPagination,
  getTruckAllWithPagination,
  getUserAll,
  getVehicleTypeAll,
  getRowId,
  type IncomeExpense,
  type Load,
  type Truck,
  type User,
  type VehicleType,
} from "@/model/api";
import { isAdminLikeRole, canAccess } from "@/lib/permissions";
import { getEffectiveLoadStatus } from "@/lib/loadStatus";
import { useNotification } from "@/hooks/useNotification";

const CHART_COLORS = ["#5c4d96", "#7e6fb0", "#2e7d32", "#ed6c02", "#1565c0", "#c2185b", "#00838f"];

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeekSunday(d: Date): Date {
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return e;
}

function eachDayInclusive(fromYmd: string, toYmd: string): string[] {
  if (!fromYmd || !toYmd) return [];
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  if (a > b) return [];
  const out: string[] = [];
  const cur = new Date(a);
  while (cur <= b) {
    out.push(formatYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function weekdayShortMonFirst(d: Date): string {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d.getDay() === 0 ? 6 : d.getDay() - 1];
}

function buildVehicleSearch(vehicleTypeId: string): NonNullable<Parameters<typeof getLoadAllWithPagination>[0]>["search"] {
  if (!vehicleTypeId.trim()) return undefined;
  return [{ vehicleType: vehicleTypeId.trim() }];
}

function resolveVehicleTypeLabel(raw: string | undefined, types: VehicleType[]): string {
  const v = (raw ?? "").trim();
  if (!v) return "Unknown";
  const byId = types.find((t) => (t.id ?? t._id) === v);
  if (byId) return byId.vehicle_type ?? byId.name ?? v;
  const lower = v.toLowerCase();
  const byName = types.find((t) => (t.vehicle_type ?? t.name ?? "").toLowerCase() === lower);
  if (byName) return byName.vehicle_type ?? byName.name ?? v;
  // Prevent internal IDs from leaking into dashboard legends.
  const looksLikeObjectId = /^[a-f0-9]{24}$/i.test(v);
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  return looksLikeObjectId || looksLikeUuid ? "Unknown" : v;
}

function loadScheduleDayKey(load: Load): string | null {
  if (load.date != null && load.date !== "") {
    const s = typeof load.date === "string" ? load.date : new Date(load.date as string).toISOString().slice(0, 10);
    return s.slice(0, 10);
  }
  const pt = load.pickupTime;
  if (pt && /^\d{4}-\d{2}-\d{2}/.test(pt)) return pt.slice(0, 10);
  return null;
}

function isoDayKey(iso?: string): string | null {
  if (!iso) return null;
  const s = String(iso);
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

async function fetchAllLoads(base: Parameters<typeof getLoadAllWithPagination>[0]): Promise<Load[]> {
  const limit = 100;
  let page = 1;
  const all: Load[] = [];
  for (;;) {
    const res = await getLoadAllWithPagination({ ...base, page, limit });
    const chunk = res.loads ?? [];
    all.push(...chunk);
    if (chunk.length < limit || page >= (res.pagination?.totalPages ?? 1)) break;
    page += 1;
  }
  return all;
}

async function fetchAllTrucks(base: Parameters<typeof getTruckAllWithPagination>[0]): Promise<Truck[]> {
  const limit = 100;
  let page = 1;
  const all: Truck[] = [];
  for (;;) {
    const res = await getTruckAllWithPagination({ ...base, page, limit });
    const chunk = res.trucks ?? [];
    all.push(...chunk);
    if (chunk.length < limit || page >= (res.pagination?.totalPages ?? 1)) break;
    page += 1;
  }
  return all;
}

/** Stable key for deduping API rows (_id or uuid `id`). */
function loadRowKey(l: Load): string {
  const k = l._id ?? l.id;
  return k != null && String(k).trim() !== "" ? String(k) : "";
}

/** Union of load lists (e.g. scheduled-date match ∪ created-date match) without duplicates. */
function mergeLoadsUnique(...lists: Load[][]): Load[] {
  const map = new Map<string, Load>();
  for (const list of lists) {
    for (const load of list) {
      const key = loadRowKey(load);
      if (!key || map.has(key)) continue;
      map.set(key, load);
    }
  }
  return [...map.values()];
}

function defaultRange(): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { dateFrom: formatYmd(from), dateTo: formatYmd(to) };
}

export interface DashboardAnalytics {
  loading: boolean;
  error: string;
  user: User | null;
  vehicleTypes: VehicleType[];
  dateFrom: string;
  dateTo: string;
  vehicleTypeId: string;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  setVehicleTypeId: (v: string) => void;
  resetFilters: () => void;
  refresh: () => void;
  loadsCreatedLast7Count: number;
  currentWeekBar: { name: string; value: number }[];
  rangeLine: { day: string; ymd: string; loads: number; vehicles: number }[];
  mixByType: { name: string; loads: number; vehicles: number }[];
  loadTypePie: { name: string; value: number; color: string }[];
  vehicleTypePie: { name: string; value: number; color: string }[];
  expensePie: { name: string; value: number; color: string }[];
  incomePie: { name: string; value: number; color: string }[];
  expenseTotal: number;
  incomeTotal: number;
  sparkLoads: { name: string; v: number }[];
  sparkVehicles: { name: string; v: number }[];
  statusRings: { value: number; label: string; centerLabel: string; colorIndex: number }[];
  showIncomeExpense: boolean;
  scopeLabel: string;
  loadsRange: Load[];
  trucksRange: Truck[];
  userDirectoryCount: number | null;
  showUserStats: boolean;
  loadsLast30: Load[];
  monthlyActivityBar: { name: string; value: number }[];
  rangeLineWeekly: { day: string; loads: number; vehicles: number }[];
}

export function useDashboardAnalytics(): DashboardAnalytics {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const def = useMemo(() => defaultRange(), []);
  const [dateFrom, setDateFrom] = useState(def.dateFrom);
  const [dateTo, setDateTo] = useState(def.dateTo);
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loadsCreatedLast7Count, setLoadsCreatedLast7Count] = useState(0);
  const [loadsWeek, setLoadsWeek] = useState<Load[]>([]);
  const [loadsRange, setLoadsRange] = useState<Load[]>([]);
  const [trucksRange, setTrucksRange] = useState<Truck[]>([]);
  const [loadsLast7Series, setLoadsLast7Series] = useState<Load[]>([]);
  const [trucksLast7Series, setTrucksLast7Series] = useState<Truck[]>([]);
  const [incomeExpenses, setIncomeExpenses] = useState<IncomeExpense[]>([]);
  const [userDirectoryCount, setUserDirectoryCount] = useState<number | null>(null);
  const [loadsLast30, setLoadsLast30] = useState<Load[]>([]);
  const alive = useRef(true);

  const resetFilters = useCallback(() => {
    const r = defaultRange();
    setDateFrom(r.dateFrom);
    setDateTo(r.dateTo);
    setVehicleTypeId("");
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [me, vTypes] = await Promise.all([getCurrentUser(), getVehicleTypeAll()]);
      if (!alive.current) return;
      setUser(me ?? null);
      setVehicleTypes(vTypes ?? []);

      const scopedUserId = me && !isAdminLikeRole(me.role) ? getRowId(me) : undefined;
      if (me && !isAdminLikeRole(me.role) && !String(scopedUserId ?? "").trim()) {
        throw new Error("Your account has no user id; scoped dashboard data cannot be loaded.");
      }
      const search = buildVehicleSearch(vehicleTypeId);

      const today = new Date();
      const last7Start = new Date(today);
      last7Start.setDate(last7Start.getDate() - 6);
      const cFrom7 = formatYmd(last7Start);
      const cTo7 = formatYmd(today);

      const last30Start = new Date(today);
      last30Start.setDate(last30Start.getDate() - 29);
      const cFrom30 = formatYmd(last30Start);

      const w0 = startOfWeekMonday(today);
      const w1 = endOfWeekSunday(today);
      const weekFrom = formatYmd(w0);
      const weekTo = formatYmd(w1);

      const baseUser = scopedUserId ? { userId: scopedUserId } : {};

      const showUserStats = !!(me && canAccess(me.role, "Users", "view"));
      const userPromise = showUserStats
        ? getUserAll().catch(() => null as User[] | null)
        : Promise.resolve(null as User[] | null);

      const [countRes, lw, loadsBySchedule, loadsByCreatedInRange, tr, l7, t7, ie, l30, usersList] = await Promise.all([
        getLoadAllWithPagination({
          ...baseUser,
          createdFrom: cFrom7,
          createdTo: cTo7,
          search,
          page: 1,
          limit: 1,
        }),
        fetchAllLoads({
          ...baseUser,
          createdFrom: weekFrom,
          createdTo: weekTo,
          search,
        }),
        fetchAllLoads({
          ...baseUser,
          dateFrom,
          dateTo,
          search,
        }),
        fetchAllLoads({
          ...baseUser,
          createdFrom: dateFrom,
          createdTo: dateTo,
          search,
        }),
        fetchAllTrucks({
          ...baseUser,
          vehicleType: vehicleTypeId.trim() || undefined,
          createdFrom: dateFrom,
          createdTo: dateTo,
        }),
        fetchAllLoads({
          ...baseUser,
          createdFrom: cFrom7,
          createdTo: cTo7,
          search,
        }),
        fetchAllTrucks({
          ...baseUser,
          vehicleType: vehicleTypeId.trim() || undefined,
          createdFrom: cFrom7,
          createdTo: cTo7,
        }),
        canAccess(me?.role, "Income Expense", "view")
          ? getIncomeExpenseAll().catch(() => [] as IncomeExpense[])
          : Promise.resolve([] as IncomeExpense[]),
        fetchAllLoads({
          ...baseUser,
          createdFrom: cFrom30,
          createdTo: cTo7,
          search,
        }),
        userPromise,
      ]);

      if (!alive.current) return;
      setLoadsCreatedLast7Count(countRes.pagination?.total ?? 0);
      setLoadsWeek(lw);
      setLoadsRange(mergeLoadsUnique(loadsBySchedule, loadsByCreatedInRange));
      setTrucksRange(tr);
      setLoadsLast7Series(l7);
      setTrucksLast7Series(t7);
      setIncomeExpenses(Array.isArray(ie) ? ie : []);
      setLoadsLast30(l30);
      if (usersList === null) setUserDirectoryCount(null);
      else setUserDirectoryCount(Array.isArray(usersList) ? usersList.length : 0);
    } catch (e) {
      if (!alive.current) return;
      const msg = e instanceof Error ? e.message : "Failed to load dashboard";
      setError(msg);
      setUserDirectoryCount(null);
      setLoadsLast30([]);
      notify({ type: "error", message: msg });
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [dateFrom, dateTo, vehicleTypeId, notify]);

  useEffect(() => {
    alive.current = true;
    refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);

  const daysInRange = useMemo(() => eachDayInclusive(dateFrom, dateTo), [dateFrom, dateTo]);

  const currentWeekBar = useMemo(() => {
    const labels: { name: string; key: string }[] = [];
    const mon = startOfWeekMonday(new Date());
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      labels.push({ name: weekdayShortMonFirst(d), key: formatYmd(d) });
    }
    const counts: Record<string, number> = {};
    for (const l of labels) counts[l.key] = 0;
    for (const load of loadsWeek) {
      const k = isoDayKey(load.createdAt);
      if (k && counts[k] !== undefined) counts[k] += 1;
    }
    return labels.map((l) => ({ name: l.name, value: counts[l.key] ?? 0 }));
  }, [loadsWeek]);

  const rangeLine = useMemo(() => {
    const loadByDay: Record<string, number> = {};
    const truckByDay: Record<string, number> = {};
    for (const d of daysInRange) {
      loadByDay[d] = 0;
      truckByDay[d] = 0;
    }
    for (const load of loadsRange) {
      const k = loadScheduleDayKey(load);
      if (k && loadByDay[k] !== undefined) loadByDay[k] += 1;
    }
    for (const truck of trucksRange) {
      const k = isoDayKey(truck.createdAt);
      if (k && truckByDay[k] !== undefined) truckByDay[k] += 1;
    }
    return daysInRange.map((d) => ({
      day: d.slice(5),
      ymd: d,
      loads: loadByDay[d] ?? 0,
      vehicles: truckByDay[d] ?? 0,
    }));
  }, [loadsRange, trucksRange, daysInRange]);

  const rangeLineWeekly = useMemo(() => {
    const map = new Map<string, { loads: number; vehicles: number }>();
    for (const row of rangeLine) {
      const ymd = row.ymd;
      if (!ymd) continue;
      const wk = formatYmd(startOfWeekMonday(parseYmd(ymd)));
      const cur = map.get(wk) ?? { loads: 0, vehicles: 0 };
      cur.loads += row.loads;
      cur.vehicles += row.vehicles;
      map.set(wk, cur);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([wk, v]) => ({
        day: wk.slice(5),
        loads: v.loads,
        vehicles: v.vehicles,
      }));
  }, [rangeLine]);

  const monthlyActivityBar = useMemo(() => {
    const anchor = new Date();
    const out: { name: string; value: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const end = new Date(anchor);
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const from = formatYmd(start);
      const to = formatYmd(end);
      let c = 0;
      for (const load of loadsLast30) {
        const k = isoDayKey(load.createdAt);
        if (k && k >= from && k <= to) c += 1;
      }
      const label =
        w === 3 ? "4 wks ago" : w === 2 ? "3 wks ago" : w === 1 ? "2 wks ago" : "This week";
      out.push({ name: label, value: c });
    }
    return out;
  }, [loadsLast30]);

  const mixByType = useMemo(() => {
    if (vehicleTypeId.trim()) {
      const vt = vehicleTypes.find((x) => (x.id ?? x._id) === vehicleTypeId.trim());
      const name = vt ? (vt.vehicle_type ?? vt.name ?? "Selected type") : "Selected type";
      const loads = loadsRange.filter(
        (l) => resolveVehicleTypeLabel(l.vehicleType ?? l.truckType, vehicleTypes) === name
      ).length;
      const vehicles = trucksRange.filter((t) => resolveVehicleTypeLabel(t.truckType, vehicleTypes) === name).length;
      return [{ name, loads, vehicles }];
    }
    const names =
      vehicleTypes.length > 0
        ? vehicleTypes.map((t) => t.vehicle_type ?? t.name ?? "Unknown")
        : Array.from(
            new Set([
              ...loadsRange.map((l) => resolveVehicleTypeLabel(l.vehicleType ?? l.truckType, vehicleTypes)),
              ...trucksRange.map((t) => resolveVehicleTypeLabel(t.truckType, vehicleTypes)),
            ])
          );
    const useNames = names.length ? names : ["Unknown"];
    return useNames.map((name) => ({
      name,
      loads: loadsRange.filter((l) => resolveVehicleTypeLabel(l.vehicleType ?? l.truckType, vehicleTypes) === name).length,
      vehicles: trucksRange.filter((t) => resolveVehicleTypeLabel(t.truckType, vehicleTypes) === name).length,
    }));
  }, [loadsRange, trucksRange, vehicleTypes, vehicleTypeId]);

  function pieFromCounts(map: Map<string, number>): { name: string; value: number; color: string }[] {
    const entries = [...map.entries()].filter(([, v]) => v > 0);
    entries.sort((a, b) => b[1] - a[1]);
    return entries.map(([name, value], i) => ({
      name,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }

  const loadTypePie = useMemo(() => {
    const m = new Map<string, number>();
    for (const load of loadsRange) {
      const label = resolveVehicleTypeLabel(load.vehicleType ?? load.truckType, vehicleTypes);
      m.set(label, (m.get(label) ?? 0) + 1);
    }
    return pieFromCounts(m);
  }, [loadsRange, vehicleTypes]);

  const vehicleTypePie = useMemo(() => {
    const m = new Map<string, number>();
    for (const truck of trucksRange) {
      const label = resolveVehicleTypeLabel(truck.truckType, vehicleTypes);
      m.set(label, (m.get(label) ?? 0) + 1);
    }
    return pieFromCounts(m);
  }, [trucksRange, vehicleTypes]);

  const { expensePie, incomePie, expenseTotal, incomeTotal } = useMemo(() => {
    const from = dateFrom;
    const to = dateTo;
    const inRange = incomeExpenses.filter((row) => {
      const k = isoDayKey(row.createdAt ?? row.updatedAt);
      if (!k) return false;
      return k >= from && k <= to;
    });
    const expMap = new Map<string, number>();
    const incMap = new Map<string, number>();
    let expSum = 0;
    let incSum = 0;
    for (const row of inRange) {
      const cat =
        row.category && typeof row.category === "object"
          ? (row.category as { categoryName?: string }).categoryName ?? row.category_id
          : row.category_id;
      const label = cat || "Uncategorized";
      const amt = Number(row.amount) || 0;
      if (row.type === "expense") {
        expMap.set(label, (expMap.get(label) ?? 0) + amt);
        expSum += amt;
      } else {
        incMap.set(label, (incMap.get(label) ?? 0) + amt);
        incSum += amt;
      }
    }
    return {
      expensePie: pieFromCounts(expMap),
      incomePie: pieFromCounts(incMap),
      expenseTotal: expSum,
      incomeTotal: incSum,
    };
  }, [incomeExpenses, dateFrom, dateTo]);

  const sparkLoads = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const pts: { name: string; v: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      pts.push({ name: String(i + 1), v: 0 });
    }
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      keys.push(formatYmd(d));
    }
    const counts: Record<string, number> = {};
    for (const k of keys) counts[k] = 0;
    for (const load of loadsLast7Series) {
      const k = isoDayKey(load.createdAt);
      if (k && counts[k] !== undefined) counts[k] += 1;
    }
    return keys.map((k, i) => ({ name: pts[i].name, v: counts[k] ?? 0 }));
  }, [loadsLast7Series]);

  const sparkVehicles = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      keys.push(formatYmd(d));
    }
    const counts: Record<string, number> = {};
    for (const k of keys) counts[k] = 0;
    for (const truck of trucksLast7Series) {
      const k = isoDayKey(truck.createdAt);
      if (k && counts[k] !== undefined) counts[k] += 1;
    }
    return keys.map((k, i) => ({ name: String(i + 1), v: counts[k] ?? 0 }));
  }, [trucksLast7Series]);

  const statusRings = useMemo(() => {
    const total = loadsRange.length || 1;
    let pending = 0;
    let accepted = 0;
    let cancelled = 0;
    let rejected = 0;
    for (const l of loadsRange) {
      const s = getEffectiveLoadStatus(l);
      if (s === "cancelled") cancelled += 1;
      else if (s === "rejected") rejected += 1;
      else if (s === "accepted" || s === "delivered") accepted += 1;
      else if (s === "pending" || s === "assigned") pending += 1;
      else pending += 1;
    }
    const pct = (n: number) => Math.round((100 * n) / total);
    return [
      { value: pct(pending), label: "Pending", centerLabel: String(pending), colorIndex: 0 },
      { value: pct(accepted), label: "Accepted", centerLabel: String(accepted), colorIndex: 1 },
      { value: pct(cancelled), label: "Cancelled", centerLabel: String(cancelled), colorIndex: 2 },
      { value: pct(rejected), label: "Rejected", centerLabel: String(rejected), colorIndex: 3 },
    ];
  }, [loadsRange]);

  const showIncomeExpense = user?.role ? canAccess(user.role, "Income Expense", "view") : false;
  const showUserStats = user?.role ? canAccess(user.role, "Users", "view") : false;

  const scopeLabel = user?.role?.name ? `Scope: ${user.role.name}` : "Scope: your account";

  return {
    loading,
    error,
    user,
    vehicleTypes,
    dateFrom,
    dateTo,
    vehicleTypeId,
    setDateFrom,
    setDateTo,
    setVehicleTypeId,
    resetFilters,
    refresh,
    loadsCreatedLast7Count,
    currentWeekBar,
    rangeLine,
    mixByType,
    loadTypePie,
    vehicleTypePie,
    expensePie,
    incomePie,
    expenseTotal,
    incomeTotal,
    sparkLoads,
    sparkVehicles,
    statusRings,
    showIncomeExpense,
    scopeLabel,
    loadsRange,
    trucksRange,
    userDirectoryCount,
    showUserStats,
    loadsLast30,
    monthlyActivityBar,
    rangeLineWeekly,
  };
}
