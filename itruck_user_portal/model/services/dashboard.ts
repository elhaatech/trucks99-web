import { api } from "./common_fixed";

export type DashboardPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export type DashboardFilterPayload = {
  period?: DashboardPeriod;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  days?: number;
};

export type DashboardOverview = {
  weeklyIncome: number;
  weeklyBookings: { loadsBooked: number; trucksBooked: number };
  transactionSummary: {
    loadTransactions: number;
    truckTransactions: number;
    sellTransactions: number;
  };
  totalCounts: {
    totalUsers: number;
    totalTrucks: number;
    totalLoads: number;
    totalBuySellItems: number;
  };
  statusCounts: {
    loads: { pending: number; accepted: number; delivered: number; cancelled: number };
    trucks: { available: number; booked: number; inTransit: number };
    buySell: { active: number; sold: number; closed: number };
  };
  weeklyGrowth: {
    newUsers: { thisWeek: number; lastWeek: number; change: number };
    newLoads: { thisWeek: number; lastWeek: number; change: number };
    newTrucks: { thisWeek: number; lastWeek: number; change: number };
    newBuySellItems: { thisWeek: number; lastWeek: number; change: number };
  };
  revenueSummary: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
  };
  topStatistics: {
    mostBookedTruck: { truckNumber?: string; bookingCount: number } | null;
    mostViewedMarketItem: { bsNumber?: string; description?: string; viewCount: number } | null;
    mostActiveSeller: { name?: string; transactionCount: number } | null;
    mostActiveTruckOwner: { name?: string; transactionCount: number } | null;
  };
  alerts: {
    lowActivity: boolean;
    noBookings: boolean;
    noTransactions: boolean;
    cancelledBookingCount: number;
    failedOrRejectedOffers: number;
  };
  transactionStats: {
    averageTransactionValue: number;
    averageBookingValue: number;
    completedTransactions: number;
    pendingTransactions: number;
  };
  period?: { start: string; end: string };
};

export type DashboardAccessCheck = {
  hasAccess: boolean;
  isAdmin: boolean;
};

function postDashboard<T>(path: string, body: DashboardFilterPayload = {}): Promise<T> {
  return api<T>(`/api/dashboard/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function checkDashboardAccess(): Promise<DashboardAccessCheck> {
  return api<DashboardAccessCheck>("/api/dashboard/access-check", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getDashboardOverview(body: DashboardFilterPayload = {}) {
  return postDashboard<DashboardOverview>("overview", body);
}

export function getWeeklyIncome(body: DashboardFilterPayload = {}) {
  return postDashboard<{ weeklyIncome: number }>("weekly-income", body);
}

export function getWeeklyBookings(body: DashboardFilterPayload = {}) {
  return postDashboard<{ loadsBooked: number; trucksBooked: number }>("weekly-bookings", body);
}

export function getTransactionSummary(body: DashboardFilterPayload = {}) {
  return postDashboard<{
    loadTransactions: number;
    truckTransactions: number;
    sellTransactions: number;
  }>("transaction-summary", body);
}

export function getDashboardTotalCounts(body: DashboardFilterPayload = {}) {
  return postDashboard<{
    totalUsers: number;
    totalTrucks: number;
    totalLoads: number;
    totalBuySellItems: number;
  }>("total-counts", body);
}

export function getDashboardStatusCounts(body: DashboardFilterPayload = {}) {
  return postDashboard<DashboardOverview["statusCounts"]>("status-counts", body);
}

export function getDashboardWeeklyGrowth(body: DashboardFilterPayload = {}) {
  return postDashboard<DashboardOverview["weeklyGrowth"]>("weekly-growth", body);
}

export function getDashboardRecentActivities(body: DashboardFilterPayload = {}) {
  return postDashboard<Record<string, unknown[]>>("recent-activities", body);
}

export function getDashboardRevenueSummary(body: DashboardFilterPayload = {}) {
  return postDashboard<DashboardOverview["revenueSummary"]>("revenue-summary", body);
}

export function getDashboardTopStatistics(body: DashboardFilterPayload = {}) {
  return postDashboard<DashboardOverview["topStatistics"]>("top-statistics", body);
}

export function getDashboardRevenueTrend(body: DashboardFilterPayload = {}) {
  return postDashboard<{ days: number; trend: { date: string; income: number; expense: number; net: number }[] }>(
    "revenue-trend",
    body,
  );
}

export function getDashboardRecentUsers(body: DashboardFilterPayload = {}) {
  return postDashboard<{
    users: { id?: string; name?: string; role?: string; status?: string; createdAt?: string }[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>("recent-users", body);
}

export function getDashboardRecentTransactions(body: DashboardFilterPayload = {}) {
  return postDashboard<{ items: unknown[]; pagination: { page: number; limit: number; total: number } }>(
    "recent-transactions",
    body,
  );
}

export function getDashboardTopItems(body: DashboardFilterPayload = {}) {
  return postDashboard<{ loads: unknown[]; trucks: unknown[]; marketItems: unknown[] }>("top-items", body);
}

export function getDashboardAlerts(body: DashboardFilterPayload = {}) {
  return postDashboard<DashboardOverview["alerts"]>("alerts", body);
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return "₹0";
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}
