import { useCallback, useEffect, useState } from "react";
import {
  getDashboardOverview,
  getDashboardRevenueTrend,
  getDashboardRecentUsers,
  type DashboardFilterPayload,
  type DashboardOverview,
} from "@/model/services/dashboard";

export type AdminDashboardState = {
  loading: boolean;
  error: string | null;
  overview: DashboardOverview | null;
  revenueTrend: { date: string; income: number; expense: number; net: number }[];
  recentUsers: { name?: string; role?: string; status?: string; createdAt?: string }[];
  period: DashboardFilterPayload["period"];
  refresh: () => Promise<void>;
  setPeriod: (period: DashboardFilterPayload["period"]) => void;
};

export function useAdminDashboard(initialPeriod: DashboardFilterPayload["period"] = "weekly"): AdminDashboardState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; income: number; expense: number; net: number }[]>([]);
  const [recentUsers, setRecentUsers] = useState<{ name?: string; role?: string; status?: string; createdAt?: string }[]>([]);
  const [period, setPeriodState] = useState<DashboardFilterPayload["period"]>(initialPeriod);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: DashboardFilterPayload = { period };
      const [overviewData, trendData, usersData] = await Promise.all([
        getDashboardOverview(payload),
        getDashboardRevenueTrend({ days: period === "monthly" ? 30 : 7 }),
        getDashboardRecentUsers({ page: 1, limit: 5 }),
      ]);
      setOverview(overviewData);
      setRevenueTrend(trendData.trend ?? []);
      setRecentUsers(usersData.users ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const setPeriod = useCallback((p: DashboardFilterPayload["period"]) => {
    setPeriodState(p);
  }, []);

  return {
    loading,
    error,
    overview,
    revenueTrend,
    recentUsers,
    period,
    refresh: load,
    setPeriod,
  };
}
