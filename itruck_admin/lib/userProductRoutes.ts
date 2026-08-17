/**
 * User-facing Buy & Sell marketplace routes (TRUCK99 / usear portal).
 * Pattern: /usear/product/{screen}[/:id]
 */

const BASE = "/usear/product";

export const userProductRoutes = {
  dashboard: () => `${BASE}/dashboard`,
  list: (query?: Record<string, string>) => {
    const path = `${BASE}/list`;
    if (!query || Object.keys(query).length === 0) return path;
    const params = new URLSearchParams(query);
    return `${path}?${params.toString()}`;
  },
  view: (id: string) => `${BASE}/viewproduct/${encodeURIComponent(id)}`,
  create: () => `${BASE}/my-listings?tab=create`,
  edit: (id: string) => `${BASE}/edit/${encodeURIComponent(id)}`,
  cart: () => `${BASE}/cart`,
  /** Same screen as cart — My Favorite List */
  favorites: () => `${BASE}/cart`,
  offers: (tab?: "my" | "received") =>
    tab ? `${BASE}/offers?tab=${tab}` : `${BASE}/offers`,
  /** Sell Vehicle hub — listings + list new vehicle (same screen). */
  sellVehicle: (tab?: "list" | "create") => {
    const path = `${BASE}/my-listings`;
    if (tab === "create") return `${path}?tab=create`;
    return path;
  },
  /** @deprecated Use sellVehicle() */
  myListings: () => `${BASE}/my-listings`,
  seller: (ownerId: string) => `${BASE}/seller/${encodeURIComponent(ownerId)}`,
  emi: () => `${BASE}/emi`,
  chat: () => `${BASE}/chat`,
  featured: () => `${BASE}/featured`,
  purchases: () => `${BASE}/purchases`,
  legal: (type: "terms" | "privacy") => `${BASE}/legal/${type}`,
} as const;

export function getUserProductBasePath(): string {
  return BASE;
}
