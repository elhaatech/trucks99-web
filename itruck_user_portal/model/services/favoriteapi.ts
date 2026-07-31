import { api } from "./common";
import {
  normalizeBuySellProduct,
  getBuySellRowId,
  type BuySellProduct,
} from "./buysellapi";
import { cachedRequest, invalidateCache } from "@/lib/apiCache";
import { notifyMarketplaceFavoritesChanged } from "@/lib/marketplaceAuth";

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
  /** Legacy shape — kept for compatibility */
  favorites?: FavoriteItem[];
};

const FAVORITES_CACHE_KEY = "favorites:buySell";

function invalidateFavoritesCache(): void {
  invalidateCache(FAVORITES_CACHE_KEY);
  invalidateCache("favorites:");
}

export async function addFavorite(entity: FavoriteEntity, entity_id: string) {
  const result = await api<{ message: string }>("/api/favorite/add", {
    method: "POST",
    body: JSON.stringify({ entity, entity_id }),
  });
  invalidateFavoritesCache();
  notifyMarketplaceFavoritesChanged();
  return result;
}

export async function removeFavorite(entity: FavoriteEntity, entity_id: string) {
  const result = await api<{ message: string }>("/api/favorite/remove", {
    method: "DELETE",
    body: JSON.stringify({ entity, entity_id }),
  });
  invalidateFavoritesCache();
  notifyMarketplaceFavoritesChanged();
  return result;
}

async function fetchBuySellFavoriteList(): Promise<FavoriteListResponse> {
  return api<FavoriteListResponse>("/api/favorite/list", {
    method: "POST",
    body: JSON.stringify({ entity: "buySell" }),
  });
}

/** Full buy-sell products saved as favourites (API `data` array). */
export async function listBuySellFavoriteProducts(): Promise<BuySellProduct[]> {
  const res = await cachedRequest(
    FAVORITES_CACHE_KEY,
    fetchBuySellFavoriteList,
    20_000,
  );

  if (Array.isArray(res?.data)) {
    return res.data.map((item) => normalizeBuySellProduct(item));
  }

  return [];
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
    const res = await cachedRequest(
      FAVORITES_CACHE_KEY,
      fetchBuySellFavoriteList,
      20_000,
    );
    if (typeof res?.count === "number") return res.count;
    if (Array.isArray(res?.data)) return res.data.length;
    return 0;
  } catch {
    return 0;
  }
}
