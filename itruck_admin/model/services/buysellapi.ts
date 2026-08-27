import { api } from "./common";
import { axiosClient } from "./axiosClient";

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
  userId?: string;
  packageName?: string;
  paymentAmount?: number;
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
  sort?: "newest" | "oldest";
  status?: "all" | "pending" | "active" | "expired" | "cancelled" | "rejected";
};

export type BuySellProduct = {
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
  sellerName?: string;
  featured?: FeaturedVehicleMeta;
  placement?: FeaturedVehiclePlacementRecord | null;
  isFeatured?: boolean;
  featuredExpiryDate?: string | null;
  bit_records?: Array<{
    _id?: string;
    id?: string;
    productId?: string;
    bit?: number;
    status?: string;
    userId?: string;
    userName?: string;
    createdAt?: string;
  }>;
  bid_count?: number;
  highest_bid?: number | null;
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
  country_id?: string;
  state_id?: string;
  city_id?: string;
  user_type?: "buy" | "sell" | "";
  usear_type?: "buy" | "sell" | "";
  min_price?: number;
  max_price?: number;
  filters?: Array<{
    specification_id: string;
    specification_value?: string[] | string;
  }>;
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
};

/** bsNumber (`18-08-2026 - BS256`) and vehicleId (`YYMMDD####`) are generated by the server. Do not send them on create. */
export type BuySellCreatePayload = {
  category_id: string;
  subcategory_id: string;
  price: number | string;
  description: string;
  images: string[];
  specifications: Array<{ specification_id: string; specification_value: string }>;
  country_id: string;
  state_id: string;
  city_id: string;
  address: string;
  pincode: string;
  status?: string;
  /** Admin create only — listing is posted under this user. Ignored for non-admins. */
  userid?: string;
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

export async function getBuySellList(body: BuySellListFilter = {}): Promise<BuySellProduct[]> {
  try {
    const payload = await api<unknown>("/api/buy-sell/list", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return unwrapBuySellListResponse(payload);
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
    const payload = await api<BuySellDashboardStatsResponse>(
      "/api/buy-sell/dashboard-stats",
    );
    if (!payload?.data?.marketplace) {
      throw new Error("Invalid dashboard stats response");
    }
    return payload.data;
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

/** POST /api/buy-sell/featured-vehicles/list — active paid featured marketplace listings. */
export async function getBuySellFeaturedVehicles(limit = 8): Promise<BuySellProduct[]> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), 24);
    const payload = await api<BuySellRecentVehiclesResponse>(
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

/** GET /api/buy-sell/featured-vehicles/admin — admin featured placements + Free Plan requests. */
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

export async function makeFeaturedVehicleAdmin(
  productId: string,
): Promise<{ message: string; duplicate?: boolean; data?: unknown }> {
  try {
    return await api("/api/buy-sell/featured-vehicles/admin", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
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
};

export type BuySellOwnerProductsBody = {
  excludeProductId?: string;
  page?: number;
  limit?: number;
};

/** POST /api/buy-sell/products/owner/:ownerId — seller's other active listings. */
export async function postBuySellProductsByOwner(
  params: BuySellOwnerProductsParams,
): Promise<BuySellOwnerProductsResponse["data"]> {
  try {
    const { ownerId, excludeProductId, page = 1, limit = 12 } = params;
    const body: BuySellOwnerProductsBody = {
      excludeProductId,
      page,
      limit,
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