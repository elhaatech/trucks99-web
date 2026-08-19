import { api } from "./common";
import {
  normalizeBuySellProduct,
  getBuySellRowId,
  type BuySellProduct,
} from "./buysellapi";

export type FavoriteEntity = "buySell" | "material" | string;

export type FavoriteItem = {
  _id: string;
  entity: FavoriteEntity;
  entity_id: string;
  createdAt?: string;
};

/** Backend: POST /api/favorite/list → { message, count, data: Product[] } */
export type FavoriteListResponse = {
  message?: string;
  count?: number;
  data?: BuySellProduct[];
  scope?: "all" | "self";
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  /** Legacy shape — kept for compatibility */
  favorites?: FavoriteItem[];
};

export type AdminFavoriteRow = BuySellProduct & {
  favoriteId?: string;
  favoritedAt?: string;
  favoritedBy?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    mobile?: string;
  } | null;
};

export type AdminFavoriteListParams = {
  entity?: FavoriteEntity;
  page?: number;
  limit?: number;
  search?: string;
};

/** Full buy-sell products saved as favourites (API `data` array). */
export async function listBuySellFavoriteProducts(): Promise<BuySellProduct[]> {
  const res = await api<FavoriteListResponse>("/api/favorite/list", {
    method: "POST",
    body: JSON.stringify({ entity: "buySell" }),
  });

  if (Array.isArray(res?.data)) {
    return res.data.map((item) => normalizeBuySellProduct(item));
  }

  return [];
}

/** Admin list — Super admin gets every user's favorites. POST body, not query. */
export async function listAdminFavorites(
  params?: AdminFavoriteListParams,
): Promise<{
  data: AdminFavoriteRow[];
  pagination?: FavoriteListResponse["pagination"];
  scope?: "all" | "self";
}> {
  const body = {
    entity: params?.entity || "buySell",
    page: params?.page || 1,
    limit: params?.limit || 20,
    search: params?.search?.trim() || "",
  };
  const res = await api<FavoriteListResponse>("/api/favorite/list", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = Array.isArray(res?.data)
    ? res.data.map((item) => normalizeBuySellProduct(item) as AdminFavoriteRow)
    : [];
  return { data, pagination: res?.pagination, scope: res?.scope };
}

export async function removeFavoriteById(favoriteId: string) {
  return api<{ message: string }>("/api/favorite/remove", {
    method: "DELETE",
    body: JSON.stringify({ favoriteId }),
  });
}

export async function addFavorite(entity: FavoriteEntity, entity_id: string) {
  return api<{ message: string }>("/api/favorite/add", {
    method: "POST",
    body: JSON.stringify({ entity, entity_id }),
  });
}

export async function removeFavorite(entity: FavoriteEntity, entity_id: string) {
  return api<{ message: string }>("/api/favorite/remove", {
    method: "DELETE",
    body: JSON.stringify({ entity, entity_id }),
  });
}

/** Lightweight favourite id rows — derived from product list when possible. */
export async function listFavorites(entity?: FavoriteEntity): Promise<FavoriteItem[]> {
  if (entity === "buySell" || !entity) {
    const products = await listBuySellFavoriteProducts();
    return products.map((product) => ({
      _id: String(product._id ?? product.id ?? ""),
      entity: "buySell",
      entity_id: String(getBuySellRowId(product)),
    }));
  }

  const res = await api<FavoriteListResponse>("/api/favorite/list", {
    method: "POST",
    body: JSON.stringify({ entity }),
  });

  return res?.favorites ?? [];
}

export async function getBuySellFavoriteCount(): Promise<number> {
  try {
    const res = await api<FavoriteListResponse>("/api/favorite/list", {
      method: "POST",
      body: JSON.stringify({ entity: "buySell" }),
    });
    if (typeof res?.count === "number") return res.count;
    if (Array.isArray(res?.data)) return res.data.length;
    return 0;
  } catch {
    return 0;
  }
}
