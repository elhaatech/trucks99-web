import { api, publicApi } from "./common_fixed";
import { axiosClient } from "./axiosClient";
import { cachedRequest, invalidateCache } from "@/lib/apiCache";

export type BuySellSpecification = {
  specification_id: string;
  specification_value: string;
  specification_info?: {
    specification_name: string;
    type: string;
    is_required: string;
  } | null;
  specification_value_info?: {
    specification_value_name: string;
  } | null;
};

export type BuySellProductStatus =
  | "active"
  | "inactive"
  | "pending"
  | "draft"
  | "rejected"
  | "booking"
  | "purchased"
  | "sold";

export type BuySellProduct = {
  profileImage(profileImage: any): string | null | undefined;
  bsNumber: string | null | undefined;
  vehicleId?: string | null;
  is_favorite: unknown;
  _id: string;
  id?: string;
  category_id: { _id: string; category_name: string } | string | null;
  subcategory_id: { _id: string; sub_category_name: string } | string | null;
  userid?: string;
  price: number;
  description: string;
  images: string[];
  specifications: BuySellSpecification[];
  /** Resolved highlight fields from list enrichment (preferred for cards). */
  listing_highlights?: {
    makeYear?: string | null;
    mileage?: string | null;
    fuelType?: string | null;
    owners?: string | null;
    brand?: string | null;
    listingId?: string | null;
  } | null;
  country_id?: string;
  state_id?: string;
  city_id?: string;
  country_info?: { _id: string; name: string };
  state_info?: { _id: string; name: string };
  city_info?: { _id: string; name: string };
  address: string;
  pincode: string;
  viewCount?: number;
  status: BuySellProductStatus;
  bookedBy?: string | null;
  bookedAt?: string | null;
  advanceAmount?: number | null;
  purchasedBy?: string | null;
  purchasedAt?: string | null;
  purchaseAmount?: number | null;
  soldAt?: string | null;
  created_by?: string;
  updated_by?: string;
  createdAt?: string;
  updatedAt?: string;
  seller_mobile?: string;
  bit_records?: Array<{
    _id?: string;
    id?: string;
    productId?: string;
    bit?: number;
    status?: string;
    userId?: string;
    userName?: string;
    buyer_name?: string | null;
    buyer_mobile?: string | null;
    createdAt?: string;
  }>;
  bid_count?: number;
  highest_bid?: number | null;
  sellerName?: string;
  featured?: FeaturedVehicleMeta;
  placement?: FeaturedVehiclePlacementRecord | null;
  /** Denormalized on product doc + list API when seller loads listings. */
  isFeatured?: boolean;
  featuredExpiryDate?: string | null;
};

export type FeaturedVehicleMeta = {
  featuredPlacementId?: string;
  productId?: string;
  sellerId?: string;
  packageId?: string;
  packageName?: string;
  packageType?: string;
  price?: number;
  paymentAmount?: number;
  paymentId?: string | null;
  orderId?: string | null;
  paymentStatus?: string | null;
  durationDays?: number;
  featuredStatus?: string;
  expiryStatus?: string | null;
  remainingDays?: number | null;
  featuredAt?: string;
  featuredStartDate?: string;
  expiresAt?: string;
  featuredEndDate?: string;
  source?: "paid" | "free_plan" | string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  requester?: {
    _id?: string;
    name?: string;
    email?: string;
    mobile?: string;
  } | null;
};

export type FeaturedVehiclePlacementRecord = {
  _id?: string;
  placementId?: string;
  productId?: string;
  sellerId?: string;
  packageId?: string;
  packageName?: string;
  paymentAmount?: number;
  paymentId?: string | null;
  orderId?: string | null;
  paymentStatus?: string | null;
  featuredStartDate?: string;
  featuredEndDate?: string;
  expiresAt?: string;
  status?: string;
  expiryStatus?: string | null;
  remainingDays?: number | null;
  createdAt?: string;
  updatedAt?: string;
  source?: "paid" | "free_plan" | string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  requester?: {
    _id?: string;
    name?: string;
    email?: string;
    mobile?: string;
  } | null;
};

export type FeaturedVehiclesListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "expiry_soon";
  status?: "all" | "pending" | "active" | "expired" | "cancelled" | "rejected";
};

export type FeaturedVehiclesListResponse = {
  success: boolean;
  data: BuySellProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  sort: string;
  total?: number;
  limit?: number;
};

export type BuySellLifecycleResponse = {
  success: boolean;
  message: string;
  subMessage?: string;
  data: {
    _id: string;
    id?: string;
    status: BuySellProductStatus;
    bookedBy?: string;
    bookedAt?: string;
    advanceAmount?: number;
    purchasedBy?: string;
    purchasedAt?: string;
    purchaseAmount?: number;
    soldAt?: string;
  };
};

export type BuySellListFilter = {
  category_id?: string;
  subcategory_id?: string;
  status?: string;
  /** Server-side multi-status filter (e.g. active + pending browse). */
  statuses?: string[];
  country_id?: string;
  state_id?: string;
  city_id?: string;
  /** Filter by seller (Mongo _id or custom uuid). */
  userid?: string;
  user_type?: "buy" | "sell" | "all" | "";
  usear_type?: "buy" | "sell" | "all" | "";
  min_price?: number;
  max_price?: number;
  no_of_owners_min?: number;
  no_of_owners_max?: number;
  km_min?: number;
  km_max?: number;
  make_year_min?: number;
  make_year_max?: number;
  /** When set with limit, server paginates (faster home/list pages). */
  page?: number;
  limit?: number;
  /** Server-side text search (description, address, bsNumber, pincode). */
  search?: string;
  q?: string;
  /** Server-side sort: newest | price_asc | price_desc | views */
  sort?: "newest" | "price_asc" | "price_desc" | "views";
  filters?: Array<{
    specification_id: string;
    specification_value?: string[] | string;
  }>;
};

export type BuySellListPage = {
  items: BuySellProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type BuySellStatusCounts = {
  totalActive: number;
  totalBooked: number;
  totalPurchased: number;
  totalSold: number;
  totalPending: number;
  totalRejected: number;
  totalDraft: number;
  totalInactive: number;
  total: number;
};

/** Metrics returned by GET /api/buy-sell/dashboard-stats (marketplace + optional mySell). */
export type BuySellDashboardMetrics = {
  totalListings: number;
  activeListings: number;
  soldVehicles: number;
  totalOffers: number;
  totalBooked?: number;
  totalPending?: number;
  totalActive?: number;
  totalDraft?: number;
  totalRejected?: number;
  totalInactive?: number;
  totalPurchased?: number;
  totalSold?: number;
};

export type BuySellDashboardStatsResponse = {
  success: boolean;
  data: {
    marketplace: BuySellDashboardMetrics;
    mySell: BuySellDashboardMetrics | null;
  };
  totalUsers?: number;

};

/** bsNumber (`18-08-2026 - BS256`) and vehicleId (`YYMMDD####`) are generated by the server. Do not send them on create. */
export type BuySellCreatePayload = {
  category_id: string;
  subcategory_id: string;
  price: number | string;
  description: string;
  images: string[];
  /** Legacy edit alias — same URL list as `images`. */
  existing_images?: string[];
  specifications: Array<{ specification_id: string; specification_value: string }>;
  country_id: string;
  state_id: string;
  city_id: string;
  address: string;
  pincode: string;
  status?: string;
};
// ── Add these types near your other exported types ──────────────────────────

export type BulkUploadError = { row: number; message: string };

export type BulkUploadResult = {
  message: string;
  total: number;
  inserted: number;
  skipped: number;
  errors: BulkUploadError[];
  created?: Array<{
    _id: string;
    bsNumber: string | null;
    vehicleId?: string | null;
    category_id: string;
    price: number;
    status: string;
  }>;
};

// ── Add this function near your other exported API calls ────────────────────

/** Upload an excel file (.xlsx/.xls) to bulk-create BuySell products. */
export async function bulkUploadBuySellProducts(
  file: File,
): Promise<BulkUploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await axiosClient.post<BulkUploadResult>(
      "/api/buy-sell/bulk-upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

const EMPTY_STATUS_COUNTS: BuySellStatusCounts = {
  totalActive: 0,
  totalBooked: 0,
  totalPurchased: 0,
  totalSold: 0,
  totalPending: 0,
  totalRejected: 0,
  totalDraft: 0,
  totalInactive: 0,
  total: 0,
};

function normalizeError(error: unknown): never {
  if (error instanceof Error) throw error;
  if (typeof error === "object" && error && "response" in error) {
    const e = error as {
      response?: { data?: { message?: string; error?: string }; status?: number };
    };
    const message =
      e.response?.data?.message ||
      e.response?.data?.error ||
      (e.response?.status === 401
        ? "Please log in to continue."
        : undefined) ||
      "Request failed";
    throw new Error(message);
  }
  throw new Error("Request failed");
}

/** Ensure list items always expose a stable `id` for routing/favorites. */
export function normalizeBuySellProduct(item: BuySellProduct): BuySellProduct {
  if (!item.id && item._id) {
    return { ...item, id: String(item._id) };
  }
  return item;
}

function normalizeBuySellList(items: unknown): BuySellProduct[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => normalizeBuySellProduct(item as BuySellProduct));
}

/** POST /api/buy-sell/list — array or { success, data/products/list }. */
export function unwrapBuySellListResponse(payload: unknown): BuySellProduct[] {
  if (Array.isArray(payload)) {
    return normalizeBuySellList(payload);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const candidates = [
    root.data,
    root.products,
    root.list,
    root.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return normalizeBuySellList(candidate);
    }
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = candidate as Record<string, unknown>;
      for (const nestedKey of ["products", "list", "items", "data"]) {
        if (Array.isArray(nested[nestedKey])) {
          return normalizeBuySellList(nested[nestedKey]);
        }
      }
    }
  }

  return [];
}

/** GET /api/buy-sell/:id — product object or { product | data }. */
export function unwrapBuySellProductResponse(payload: unknown): BuySellProduct {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid product response");
  }

  const root = payload as Record<string, unknown>;

  if (root.product && typeof root.product === "object") {
    return normalizeBuySellProduct(root.product as BuySellProduct);
  }

  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    const data = root.data as Record<string, unknown>;
    if (data.product && typeof data.product === "object") {
      return normalizeBuySellProduct(data.product as BuySellProduct);
    }
    if ("_id" in data || "id" in data) {
      return normalizeBuySellProduct(data as BuySellProduct);
    }
  }

  if ("_id" in root || "id" in root) {
    return normalizeBuySellProduct(root as BuySellProduct);
  }

  throw new Error("Invalid product response");
}

/** POST /api/buy-sell/purchase-list — split purchased vs available arrays. */
export function unwrapBuySellPurchaseListResponse(
  payload: unknown,
): BuySellPurchaseListResponse {
  const empty: BuySellPurchaseListResponse = {
    purchasedProducts: [],
    nonPurchasedProducts: [],
  };

  if (!payload || typeof payload !== "object") {
    return empty;
  }

  const root = payload as Record<string, unknown>;
  const source =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;

  return {
    purchasedProducts: normalizeBuySellList(source.purchasedProducts),
    nonPurchasedProducts: normalizeBuySellList(source.nonPurchasedProducts),
  };
}

export function getBuySellRowId(row: BuySellProduct): string {
  return row.id ?? row._id;
}

export function resolveBuySellRefId(
  value: unknown,
): string | undefined {
  if (value == null) return undefined;

  if (typeof value === "string") {
    const str = value.trim();
    return str && str !== "null" && str !== "undefined" ? str : undefined;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    for (const key of ["_id", "id", "uuid"]) {
      const candidate = obj[key];
      if (candidate == null) continue;
      const str = String(candidate).trim();
      if (str && str !== "null" && str !== "undefined") {
        return str;
      }
    }

    if (typeof (obj as { toHexString?: () => string }).toHexString === "function") {
      const hex = (obj as { toHexString: () => string }).toHexString();
      if (hex) return hex;
    }
  }

  const str = String(value).trim();
  return str && str !== "null" && str !== "undefined" ? str : undefined;
}

export async function getBuySellList(
  body: BuySellListFilter = {},
  options?: { signal?: AbortSignal },
): Promise<BuySellProduct[]> {
  const cacheKey = `buy-sell-list:${JSON.stringify(body)}`;
  try {
    return await cachedRequest(
      cacheKey,
      async () => {
        const payload = await api<unknown>("/api/buy-sell/list", {
          method: "POST",
          body: JSON.stringify(body),
          signal: options?.signal,
        });
        return unwrapBuySellListResponse(payload);
      },
      options?.signal ? 0 : 15_000,
    );
  } catch (error) {
    normalizeError(error);
  }
}

/** Read page meta from top-level fields or nested `pagination`. */
function readBuySellListPagination(
  payload: unknown,
  fallback: { page: number; limit: number; itemCount: number },
): Omit<BuySellListPage, "items"> {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const nested =
    root.pagination && typeof root.pagination === "object"
      ? (root.pagination as Record<string, unknown>)
      : {};

  const num = (v: unknown, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : d;

  const limit = num(nested.limit, num(root.limit, fallback.limit));
  const page = num(nested.page, num(root.page, fallback.page));
  const total = num(nested.total, num(root.total, fallback.itemCount));
  const totalPages = num(
    nested.totalPages,
    num(root.totalPages, Math.max(1, Math.ceil(total / Math.max(1, limit)))),
  );

  return { total, page, limit, totalPages };
}

/** Paginated list — prefers server `total` when page/limit are sent. */
export async function getBuySellListPage(
  body: BuySellListFilter & { page: number; limit: number },
  options?: { signal?: AbortSignal },
): Promise<BuySellListPage> {
  const cacheKey = `buy-sell-list-page:${JSON.stringify(body)}`;
  const fetchPage = async (): Promise<BuySellListPage> => {
    const payload = await api<unknown>("/api/buy-sell/list", {
      method: "POST",
      body: JSON.stringify(body),
      signal: options?.signal,
    });
    const items = unwrapBuySellListResponse(payload);
    const meta = readBuySellListPagination(payload, {
      page: body.page,
      limit: body.limit,
      itemCount: items.length,
    });
    return { items, ...meta };
  };

  try {
    // Never dedupe/cache cancellable scroll requests — a shared in-flight promise
    // tied to an aborted signal makes the next caller inherit "signal is aborted".
    if (options?.signal) {
      return await fetchPage();
    }
    return await cachedRequest(cacheKey, fetchPage, 15_000);
  } catch (error) {
    normalizeError(error);
  }
}

/** GET /api/buy-sell/status-counts — listing counts for current user (or all for admin). */
export async function getBuySellStatusCounts(): Promise<BuySellStatusCounts> {
  try {
    const payload = await api<{
      success?: boolean;
      data?: BuySellStatusCounts;
    }>("/api/buy-sell/status-counts");
    return payload?.data ?? EMPTY_STATUS_COUNTS;
  } catch (error) {
    normalizeError(error);
  }
}

/** GET /api/buy-sell/dashboard-stats — marketplace + signed-in seller metrics. */
export async function getBuySellDashboardStats(): Promise<
  BuySellDashboardStatsResponse["data"]
> {
  try {
    return await cachedRequest(
      "buy-sell-dashboard-stats",
      async () => {
        const payload = await api<BuySellDashboardStatsResponse>(
          "/api/buy-sell/dashboard-stats",
        );
        if (!payload?.data?.marketplace) {
          throw new Error("Invalid dashboard stats response");
        }
        return payload.data;
      },
      20_000,
    );
  } catch (error) {
    normalizeError(error);
  }
}

export type BuySellRecentVehiclesResponse = {
  success: boolean;
  data: BuySellProduct[];
  total: number;
  limit: number;
};

export type BuySellDashboardVehiclesBody = {
  limit?: number;
};

/** POST /api/buy-sell/recent-vehicles — newest active marketplace listings. */
export async function getBuySellRecentVehicles(limit = 8): Promise<BuySellProduct[]> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), 24);
    const payload = await api<BuySellRecentVehiclesResponse>(
      "/api/buy-sell/recent-vehicles",
      {
        method: "POST",
        body: JSON.stringify({ limit: safeLimit }),
      },
    );
    if (Array.isArray(payload?.data)) {
      return normalizeBuySellList(payload.data);
    }
    return unwrapBuySellListResponse(payload);
  } catch (error) {
    normalizeError(error);
  }
}

/** POST /api/buy-sell/featured-vehicles/list — requires login. */
export async function fetchFeaturedVehicles(
  params: FeaturedVehiclesListParams = {},
): Promise<FeaturedVehiclesListResponse> {
  const body = {
    page: params.page ?? 1,
    limit: params.limit ?? 12,
    search: params.search?.trim() || "",
    sort: params.sort ?? "newest",
  };
  const cacheKey = `featured-vehicles:${JSON.stringify(body)}`;
  try {
    return await cachedRequest(
      cacheKey,
      async () => {
        const payload = await api<FeaturedVehiclesListResponse>(
          "/api/buy-sell/featured-vehicles/list",
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        );
        return {
          ...payload,
          data: normalizeBuySellList(payload.data ?? []),
          pagination: payload.pagination ?? {
            page: body.page,
            limit: body.limit,
            total: payload.total ?? payload.data?.length ?? 0,
            totalPages: Math.max(
              1,
              Math.ceil(
                (payload.total ?? payload.data?.length ?? 0) / body.limit,
              ),
            ),
          },
          sort: payload.sort ?? body.sort,
        };
      },
      15_000,
    );
  } catch (error) {
    normalizeError(error);
  }
}

/** GET /api/buy-sell/featured-vehicles/admin — admin featured placements. */
export async function fetchFeaturedVehiclesAdmin(
  params: FeaturedVehiclesListParams = {},
): Promise<FeaturedVehiclesListResponse> {
  try {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.sort) query.set("sort", params.sort);
    if (params.status) query.set("status", params.status);
    const qs = query.toString();
    return await api<FeaturedVehiclesListResponse>(
      `/api/buy-sell/featured-vehicles/admin${qs ? `?${qs}` : ""}`,
    );
  } catch (error) {
    normalizeError(error);
  }
}

export async function updateFeaturedVehicleAdminStatus(
  placementId: string,
  status: "active" | "cancelled" | "approved" | "rejected",
  reason?: string,
): Promise<{ message: string }> {
  try {
    return await api(`/api/buy-sell/featured-vehicles/admin/${encodeURIComponent(placementId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    });
  } catch (error) {
    normalizeError(error);
  }
}

export async function removeFeaturedVehicleAdmin(
  placementId: string,
): Promise<{ message: string }> {
  try {
    return await api(`/api/buy-sell/featured-vehicles/admin/${encodeURIComponent(placementId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    normalizeError(error);
  }
}

/** POST /api/buy-sell/featured-vehicles/list — public featured marketplace listings. */
export async function getBuySellFeaturedVehicles(limit = 8): Promise<BuySellProduct[]> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), 24);
    return await cachedRequest(
      `buy-sell-featured:${safeLimit}`,
      async () => {
        const payload = await publicApi<BuySellRecentVehiclesResponse>(
          "/api/buy-sell/featured-vehicles/list",
          {
            method: "POST",
            body: JSON.stringify({ limit: safeLimit }),
          },
        );
        if (Array.isArray(payload?.data)) {
          return normalizeBuySellList(payload.data);
        }
        return unwrapBuySellListResponse(payload);
      },
      20_000,
    );
  } catch (error) {
    normalizeError(error);
  }
}

export type ActivateFeaturedVehicleBody = {
  productId: string;
  orderId?: string;
  paymentId?: string;
  subscriptionItemId?: string;
  packageName?: string;
};

/** POST /api/buy-sell/featured-vehicles — idempotent activate after verified payment. */
export async function activateBuySellFeaturedVehicle(
  body: ActivateFeaturedVehicleBody,
): Promise<{ message: string; duplicate?: boolean; data?: unknown }> {
  try {
    return await api("/api/buy-sell/featured-vehicles", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    normalizeError(error);
  }
}

export type RequestFreePlanFeaturedVehicleResponse = {
  success: boolean;
  pendingApproval: boolean;
  featuredActivated: boolean;
  duplicate?: boolean;
  message: string;
  data?: unknown;
};

/** POST /api/buy-sell/featured-vehicles/free-plan — seller Free Plan request (pending admin approval). */
export async function requestFreePlanFeaturedVehicle(body: {
  productId: string;
  subscriptionItemId: string;
  packageName?: string;
}): Promise<RequestFreePlanFeaturedVehicleResponse> {
  try {
    return await api("/api/buy-sell/featured-vehicles/free-plan", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    normalizeError(error);
  }
}

/**
 * POST /api/buy-sell/add — create a sell listing (authenticated seller).
 * Alias for clarity in user-facing sell flows.
 */
export async function sellBuySellProduct(
  payload: BuySellCreatePayload,
): Promise<{ message: string; product: BuySellProduct }> {
  return createBuySellProduct(payload);
}

export async function createBuySellProduct(payload: BuySellCreatePayload): Promise<{ message: string; product: BuySellProduct }> {
  try {
    if (!payload.category_id?.trim() || !payload.subcategory_id?.trim()) {
      throw new Error("Category and subcategory are required.");
    }
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Enter a valid price greater than zero.");
    }
    const res = await axiosClient.post<{ message: string; product: BuySellProduct }>("/api/buy-sell/add", {
      ...payload,
      price,
    });
    return {
      message: res.data.message || "Created successfully",
      product: normalizeBuySellProduct(res.data.product),
    };
  } catch (error) {
    normalizeError(error);
  }
}

export async function getBuySellProduct(id: string): Promise<BuySellProduct> {
  try {
    const payload = await api<unknown>(`/api/buy-sell/${encodeURIComponent(id)}`);
    return unwrapBuySellProductResponse(payload);
  } catch (error) {
    normalizeError(error);
  }
}

const viewedInFlight = new Map<string, Promise<{ id?: string; viewCount: number; incremented: boolean }>>();

function getMarketplaceViewSessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "itruck_view_session";
  try {
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`)
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 64);
      window.localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Increment market item view count (deduped per user/session within 24h on server). */
export async function incrementMarketItemView(id: string): Promise<{ id?: string; viewCount: number; incremented: boolean }> {
  const existing = viewedInFlight.get(id);
  if (existing) return existing;

  const run = (async () => {
    try {
      const sessionId = getMarketplaceViewSessionId();
      const res = await axiosClient.patch<{ id?: string; viewCount: number; incremented: boolean }>(
        `/api/buy-sell/${id}/view`,
        sessionId ? { sessionId } : {},
      );
      return res.data;
    } catch (error) {
      normalizeError(error);
    }
  })();

  viewedInFlight.set(id, run);
  try {
    return await run;
  } finally {
    if (typeof window !== "undefined") {
      window.setTimeout(() => viewedInFlight.delete(id), 4000);
    } else {
      viewedInFlight.delete(id);
    }
  }
}

export async function updateBuySellProduct(
  id: string,
  payload: Partial<BuySellCreatePayload>
): Promise<{ message: string; product: BuySellProduct }> {
  try {
    const res = await axiosClient.put<{ message: string; product: BuySellProduct }>(`/api/buy-sell/edit/${id}`, payload);
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function deleteBuySellProducts(ids: string[]): Promise<{ message: string; deletedCount: number }> {
  try {
    const res = await axiosClient.delete<{ message: string; deletedCount: number }>("/api/buy-sell/delete", {
      data: { ids },
    });
    invalidateCache("buy-sell-list");
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export type BuySellPurchaseListResponse = {
  purchasedProducts: BuySellProduct[];
  nonPurchasedProducts: BuySellProduct[];
};

export type BuySellOwnerProductsOwner = {
  _id: string;
  id?: string | null;
  name?: string | null;
  profileImage?: string | null;
  mobile?: string | null;
};

export type BuySellOwnerProductsResponse = {
  success: boolean;
  data: {
    owner: BuySellOwnerProductsOwner;
    products: BuySellProduct[];
    total: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message?: string;
};

export type BuySellOwnerProductsParams = {
  ownerId: string;
  excludeProductId?: string;
  page?: number;
  limit?: number;
  cityId?: string;
  countryId?: string;
  stateId?: string;
  categoryId?: string;
  subcategoryId?: string;
};

export type BuySellOwnerProductsBody = {
  excludeProductId?: string;
  page?: number;
  limit?: number;
  city_id?: string;
  country_id?: string;
  state_id?: string;
  category_id?: string;
  subcategory_id?: string;
};

/** POST /api/buy-sell/products/owner/:ownerId — seller's other active listings. */
export async function postBuySellProductsByOwner(
  params: BuySellOwnerProductsParams,
): Promise<BuySellOwnerProductsResponse["data"]> {
  try {
    const { ownerId, excludeProductId, page = 1, limit = 12, cityId, countryId, stateId, categoryId, subcategoryId } = params;
    const normalizedCityId = resolveBuySellRefId(cityId);
    const normalizedCountryId = resolveBuySellRefId(countryId);
    const normalizedStateId = resolveBuySellRefId(stateId);
    const normalizedCategoryId = resolveBuySellRefId(categoryId);
    const normalizedSubcategoryId = resolveBuySellRefId(subcategoryId);
    const body: BuySellOwnerProductsBody = {
      excludeProductId,
      page,
      limit,
      ...(normalizedCityId ? { city_id: normalizedCityId } : {}),
      ...(normalizedCountryId !== undefined ? { country_id: normalizedCountryId } : {}),
      ...(normalizedStateId ? { state_id: normalizedStateId } : {}),
      ...(normalizedCategoryId ? { category_id: normalizedCategoryId } : {}),
      ...(normalizedSubcategoryId ? { subcategory_id: normalizedSubcategoryId } : {}),
    };

    const res = await api<BuySellOwnerProductsResponse>(
      `/api/buy-sell/products/owner/${encodeURIComponent(ownerId)}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    if (!res?.success || !res.data) {
      throw new Error(res?.message || "Failed to load seller products");
    }
    return {
      ...res.data,
      products: normalizeBuySellList(res.data.products),
    };
  } catch (error) {
    normalizeError(error);
  }
}

/** @deprecated Use postBuySellProductsByOwner */
export const getBuySellProductsByOwner = postBuySellProductsByOwner;

export type BuySellSimilarProductsParams = {
  excludeProductId?: string;
  page?: number;
  limit?: number;
  stateId?: string;
  categoryId?: string;
  subcategoryId?: string;
};

/** POST /api/buy-sell/products/similar — active listings matching location and classification. */
export async function postBuySellSimilarProducts(
  params: BuySellSimilarProductsParams,
): Promise<Pick<BuySellOwnerProductsResponse["data"], "products" | "total" | "pagination">> {
  const normalizedStateId = resolveBuySellRefId(params.stateId);
  const normalizedCategoryId = resolveBuySellRefId(params.categoryId);
  const normalizedSubcategoryId = resolveBuySellRefId(params.subcategoryId);
  try {
    const {
      excludeProductId,
      page = 1,
      limit = 12,
      stateId,
      categoryId,
      subcategoryId,
    } = params;
    const body = {
      excludeProductId,
      page,
      limit,
      ...(normalizedStateId ? { state_id: normalizedStateId } : {}),
      ...(normalizedCategoryId ? { category_id: normalizedCategoryId } : {}),
      ...(normalizedSubcategoryId ? { subcategory_id: normalizedSubcategoryId } : {}),
    };
    const res = await api<BuySellOwnerProductsResponse>(
      "/api/buy-sell/products/similar",
      { method: "POST", body: JSON.stringify(body) },
    );
    if (!res?.success || !res.data) {
      throw new Error(res?.message || "Failed to load similar products");
    }
    return {
      products: normalizeBuySellList(res.data.products ?? []),
      total: res.data.total ?? 0,
      pagination: res.data.pagination,
    };
  } catch (error) {
    // Older deployments do not have /products/similar yet. The list endpoint
    // supports the same filters, so keep recommendations working during rollout.
    if (error instanceof Error && error.message === "API route not found") {
      const products = await getBuySellList({
        state_id: normalizedStateId,
        category_id: normalizedCategoryId,
        subcategory_id: normalizedSubcategoryId,
      });
      const filteredProducts = products
        .filter((product) => getBuySellRowId(product) !== params.excludeProductId)
        .slice(0, params.limit ?? 12);
      return {
        products: filteredProducts,
        total: filteredProducts.length,
        pagination: {
          page: params.page ?? 1,
          limit: params.limit ?? 12,
          total: filteredProducts.length,
          totalPages: filteredProducts.length ? 1 : 0,
        },
      };
    }
    normalizeError(error);
  }
}

export async function getBuySellPurchaseList(
  body: BuySellListFilter = {},
): Promise<BuySellPurchaseListResponse> {
  try {
    const payload = await api<unknown>("/api/buy-sell/purchase-list", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return unwrapBuySellPurchaseListResponse(payload);
  } catch (error) {
    normalizeError(error);
  }
}

/** Admin / controlled status update (e.g. pending → active/rejected). */
export async function updateBuySellProductStatus(
  id: string,
  status: BuySellProductStatus,
): Promise<BuySellLifecycleResponse> {
  try {
    const res = await axiosClient.put<BuySellLifecycleResponse>(
      `/api/buy-sell/status/${id}`,
      { status },
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

/** Book product with advance payment (active → booking). */
export async function bookBuySellProduct(
  id: string,
  advanceAmount: number,
): Promise<BuySellLifecycleResponse> {
  try {
    const res = await axiosClient.post<BuySellLifecycleResponse>(
      `/api/buy-sell/book/${id}`,
      { advanceAmount },
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

/** Complete purchase with final payment (booking → purchased). */
export async function purchaseBuySellProduct(
  id: string,
  purchaseAmount: number,
): Promise<BuySellLifecycleResponse> {
  try {
    const res = await axiosClient.post<BuySellLifecycleResponse>(
      `/api/buy-sell/purchase/${id}`,
      { purchaseAmount },
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

/** Mark product as sold (purchased → sold). */
export async function markBuySellProductSold(
  id: string,
): Promise<BuySellLifecycleResponse> {
  try {
    const res = await axiosClient.put<BuySellLifecycleResponse>(
      `/api/buy-sell/mark-sold/${id}`,
      {},
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export type BuySellCartItem = {
  _id: string;
  id?: string;
  productId: string;
  product: BuySellProduct;
  createdAt?: string;
};

export async function getBuySellCart(): Promise<{
  success: boolean;
  items: BuySellCartItem[];
  count: number;
}> {
  try {
    const res = await axiosClient.get<{
      success: boolean;
      items: BuySellCartItem[];
      count: number;
    }>("/api/buy-sell/cart");
    return res.data ?? { success: true, items: [], count: 0 };
  } catch (error) {
    normalizeError(error);
  }
}

export async function addBuySellToCart(productId: string): Promise<{ message: string }> {
  try {
    const res = await axiosClient.post<{ success: boolean; message: string }>(
      "/api/buy-sell/cart/add",
      { productId },
    );
    return { message: res.data.message };
  } catch (error) {
    normalizeError(error);
  }
}

export async function removeBuySellFromCart(productId: string): Promise<{ message: string }> {
  try {
    const res = await axiosClient.delete<{ success: boolean; message: string }>(
      "/api/buy-sell/cart/remove",
      { data: { productId } },
    );
    return { message: res.data.message };
  } catch (error) {
    normalizeError(error);
  }
}

// ─── Razorpay product payments ────────────────────────────────────────────────

export type ProductPaymentType = "advance" | "remaining" | "full";

export type ProductPaymentOrderResponse = {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  paymentType: ProductPaymentType;
  payAmount: number;
  productId: string;
};

export async function createBuySellPaymentOrder(body: {
  productId: string;
  paymentType: ProductPaymentType;
  amount?: number;
}): Promise<ProductPaymentOrderResponse> {
  try {
    const res = await axiosClient.post<ProductPaymentOrderResponse>(
      "/api/buy-sell/payment/create-order",
      body,
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function verifyBuySellPayment(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  productId: string;
  paymentType: ProductPaymentType;
}): Promise<BuySellLifecycleResponse> {
  try {
    const res = await axiosClient.post<BuySellLifecycleResponse>(
      "/api/buy-sell/payment/verify",
      body,
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}