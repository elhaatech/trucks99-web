import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCategoryAnalytics,
  getMarketplaceProductStatus,
  getMarketplaceSummary,
  getMostViewedProducts,
  getProductViewsAnalytics,
  getRecentProductActivity,
  getTopPerformingProducts,
  getUserAnalytics,
  type CategoryAnalyticsResponse,
  type DashboardSummary,
  type MarketplaceFilter,
  type MarketplacePeriod,
  type PaginatedProducts,
  type ProductStatusResponse,
  type ProductViewsRange,
  type ProductViewsResponse,
  type RecentActivityResponse,
  type UserAnalyticsResponse,
} from "@/model/services/marketplaceDashboard";

export type DateFilterState = {
  period: MarketplacePeriod;
  dateFrom?: string;
  dateTo?: string;
};

type Section<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function emptySection<T>(): Section<T> {
  return { data: null, loading: true, error: null };
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Failed to load";
}

export function useMarketplaceDashboard() {
  const [filter, setFilter] = useState<DateFilterState>({ period: "last_30_days" });
  const [viewsRange, setViewsRange] = useState<ProductViewsRange>("30d");
  const [performingPeriod, setPerformingPeriod] = useState<MarketplacePeriod | "all">("last_30_days");
  const [viewedPage, setViewedPage] = useState(1);

  const [summary, setSummary] = useState<Section<DashboardSummary>>(emptySection);
  const [productStatus, setProductStatus] = useState<Section<ProductStatusResponse>>(emptySection);
  const [mostViewed, setMostViewed] = useState<Section<PaginatedProducts>>(emptySection);
  const [topPerforming, setTopPerforming] = useState<Section<PaginatedProducts>>(emptySection);
  const [productViews, setProductViews] = useState<Section<ProductViewsResponse>>(emptySection);
  const [categories, setCategories] = useState<Section<CategoryAnalyticsResponse>>(emptySection);
  const [userAnalytics, setUserAnalytics] = useState<Section<UserAnalyticsResponse>>(emptySection);
  const [recentActivity, setRecentActivity] = useState<Section<RecentActivityResponse>>(emptySection);

  const baseFilter = useMemo<MarketplaceFilter>(() => {
    const next: MarketplaceFilter = { period: filter.period };
    if (filter.period === "custom") {
      next.dateFrom = filter.dateFrom;
      next.dateTo = filter.dateTo;
    }
    return next;
  }, [filter]);

  const loadSummaryRow = useCallback(async (signal: { cancelled: boolean }) => {
    setSummary((s) => ({ ...s, loading: true, error: null }));
    setProductStatus((s) => ({ ...s, loading: true, error: null }));
    try {
      const [summaryData, statusData] = await Promise.all([
        getMarketplaceSummary(baseFilter),
        getMarketplaceProductStatus(baseFilter),
      ]);
      if (signal.cancelled) return;
      setSummary({ data: summaryData, loading: false, error: null });
      setProductStatus({ data: statusData, loading: false, error: null });
    } catch (err) {
      if (signal.cancelled) return;
      const message = messageOf(err);
      setSummary({ data: null, loading: false, error: message });
      setProductStatus({ data: null, loading: false, error: message });
    }
  }, [baseFilter]);

  const loadMostViewed = useCallback(async (signal: { cancelled: boolean }) => {
    setMostViewed((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getMostViewedProducts({ ...baseFilter, page: viewedPage, limit: 8 });
      if (signal.cancelled) return;
      setMostViewed({ data, loading: false, error: null });
    } catch (err) {
      if (signal.cancelled) return;
      setMostViewed({ data: null, loading: false, error: messageOf(err) });
    }
  }, [baseFilter, viewedPage]);

  const loadTopPerforming = useCallback(async (signal: { cancelled: boolean }) => {
    setTopPerforming((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getTopPerformingProducts({ period: performingPeriod, limit: 8 });
      if (signal.cancelled) return;
      setTopPerforming({ data, loading: false, error: null });
    } catch (err) {
      if (signal.cancelled) return;
      setTopPerforming({ data: null, loading: false, error: messageOf(err) });
    }
  }, [performingPeriod]);

  const loadViewsTrend = useCallback(async (signal: { cancelled: boolean }) => {
    setProductViews((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getProductViewsAnalytics({ range: viewsRange, period: viewsRange });
      if (signal.cancelled) return;
      setProductViews({ data, loading: false, error: null });
    } catch (err) {
      if (signal.cancelled) return;
      setProductViews({ data: null, loading: false, error: messageOf(err) });
    }
  }, [viewsRange]);

  const loadLowerRows = useCallback(async (signal: { cancelled: boolean }) => {
    setCategories((s) => ({ ...s, loading: true, error: null }));
    setUserAnalytics((s) => ({ ...s, loading: true, error: null }));
    setRecentActivity((s) => ({ ...s, loading: true, error: null }));
    const [cat, users, activity] = await Promise.allSettled([
      getCategoryAnalytics(baseFilter),
      getUserAnalytics(baseFilter),
      getRecentProductActivity({ ...baseFilter, limit: 12 }),
    ]);
    if (signal.cancelled) return;
    setCategories(
      cat.status === "fulfilled"
        ? { data: cat.value, loading: false, error: null }
        : { data: null, loading: false, error: messageOf(cat.reason) },
    );
    setUserAnalytics(
      users.status === "fulfilled"
        ? { data: users.value, loading: false, error: null }
        : { data: null, loading: false, error: messageOf(users.reason) },
    );
    setRecentActivity(
      activity.status === "fulfilled"
        ? { data: activity.value, loading: false, error: null }
        : { data: null, loading: false, error: messageOf(activity.reason) },
    );
  }, [baseFilter]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadSummaryRow(signal);
    loadLowerRows(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadSummaryRow, loadLowerRows]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadMostViewed(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadMostViewed]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadTopPerforming(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadTopPerforming]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadViewsTrend(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadViewsTrend]);

  const refresh = useCallback(async () => {
    const signal = { cancelled: false };
    await Promise.all([
      loadSummaryRow(signal),
      loadMostViewed(signal),
      loadTopPerforming(signal),
      loadViewsTrend(signal),
      loadLowerRows(signal),
    ]);
  }, [loadSummaryRow, loadMostViewed, loadTopPerforming, loadViewsTrend, loadLowerRows]);

  const setDateFilter = useCallback((next: DateFilterState) => {
    setViewedPage(1);
    setFilter(next);
  }, []);

  const loading = summary.loading && !summary.data;

  return {
    filter,
    setDateFilter,
    viewsRange,
    setViewsRange,
    performingPeriod,
    setPerformingPeriod,
    viewedPage,
    setViewedPage,
    summary,
    productStatus,
    mostViewed,
    topPerforming,
    productViews,
    categories,
    userAnalytics,
    recentActivity,
    loading,
    refresh,
  };
}
