import { api } from "./common";

export type MarketplacePeriod =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "custom"
  | "all";

export type ProductViewsRange = "7d" | "30d" | "3m" | "6m" | "1y";

export type MarketplaceFilter = {
  period?: MarketplacePeriod | ProductViewsRange | "all_time";
  range?: ProductViewsRange;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  category?: string;
  category_id?: string;
};

export type MetricChange = {
  count: number;
  previousCount: number;
  change: number;
  percentChange: number;
};

export type DashboardSummary = {
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  approvedProducts: number;
  rejectedProducts: number;
  soldProducts: number;
  totalUsers: number;
  activeUsers: number;
  changes: {
    totalProducts: MetricChange;
    activeProducts: MetricChange;
    pendingProducts: MetricChange;
    approvedProducts: MetricChange;
    rejectedProducts: MetricChange;
    soldProducts: MetricChange;
    totalUsers: MetricChange;
    activeUsers: MetricChange;
  };
  periodCounts?: Record<string, number>;
  period?: { start?: string | null; end?: string | null; key?: string };
};

export type ProductStatusRow = {
  key: string;
  label: string;
  count: number;
  lifetimeCount: number;
};

export type ProductStatusResponse = {
  statuses: ProductStatusRow[];
  total: number;
  period?: { start?: string | null; end?: string | null; key?: string };
};

export type DashboardProduct = {
  id: string;
  _id?: string;
  vehicleId?: string;
  bsNumber?: string;
  name: string;
  brand?: string;
  category?: string;
  categoryId?: string;
  subcategory?: string;
  price: number;
  views: number;
  favorites?: number;
  offers?: number;
  sellerName?: string;
  sellerId?: string;
  status?: string;
  createdAt?: string | null;
  image?: string | null;
};

export type PaginatedProducts = {
  items: DashboardProduct[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  rankingMetric?: string;
  period?: { start?: string | null; end?: string | null; key?: string };
};

export type ProductViewsResponse = {
  range: string;
  totalViews: number;
  trend: { date: string; views: number }[];
  period?: { start?: string | null; end?: string | null; key?: string };
};

export type CategoryAnalyticsItem = {
  id: string;
  name: string;
  productCount: number;
  views: number;
  soldCount: number;
};

export type CategoryAnalyticsResponse = {
  items: CategoryAnalyticsItem[];
};

export type UserAnalyticsResponse = {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  usersWhoViewedProducts: number;
  usersWhoFavorited: number;
  usersWhoContactedSellers: number;
  usersWhoCreatedListings: number;
};

export type RecentActivityItem = {
  id: string;
  type: string;
  action: string;
  productId?: string;
  productName?: string;
  vehicleId?: string;
  sellerName?: string;
  status?: string;
  date?: string | null;
};

export type RecentActivityResponse = {
  items: RecentActivityItem[];
};

function compactParams(filter: MarketplaceFilter = {}): Record<string, string> {
  const params: Record<string, string> = {};
  Object.entries(filter).forEach(([key, value]) => {
    if (value == null || value === "") return;
    params[key] = String(value);
  });
  return params;
}

function getMarketplace<T>(path: string, filter: MarketplaceFilter = {}): Promise<T> {
  return api<T>(`/api/dashboard/${path}`, { params: compactParams(filter) });
}

export function getMarketplaceSummary(filter: MarketplaceFilter = {}) {
  return getMarketplace<DashboardSummary>("summary", filter);
}

export function getMarketplaceProductStatus(filter: MarketplaceFilter = {}) {
  return getMarketplace<ProductStatusResponse>("product-status", filter);
}

export function getMostViewedProducts(filter: MarketplaceFilter = {}) {
  return getMarketplace<PaginatedProducts>("most-viewed-products", filter);
}

export function getTopPerformingProducts(filter: MarketplaceFilter = {}) {
  return getMarketplace<PaginatedProducts>("top-performing-products", filter);
}

export function getProductViewsAnalytics(filter: MarketplaceFilter = {}) {
  return getMarketplace<ProductViewsResponse>("product-views", filter);
}

export function getCategoryAnalytics(filter: MarketplaceFilter = {}) {
  return getMarketplace<CategoryAnalyticsResponse>("categories", filter);
}

export function getUserAnalytics(filter: MarketplaceFilter = {}) {
  return getMarketplace<UserAnalyticsResponse>("user-analytics", filter);
}

export function getRecentProductActivity(filter: MarketplaceFilter = {}) {
  return getMarketplace<RecentActivityResponse>("recent-activity", filter);
}

export function formatCount(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("en-IN");
}

export function formatPrice(amount: number): string {
  if (!Number.isFinite(amount)) return "₹0";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatPercentChange(value: number): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 1 });
  return `${n >= 0 ? "+" : "-"}${abs}%`;
}
