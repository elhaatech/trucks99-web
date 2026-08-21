/**
 * TRUCK99 user marketplace routes (standalone Next.js portal).
 * Pattern: /{screen}[/:id]
 *
 * Paths are host-root (no `/user` prefix). Compare against
 * `usePathname()`, not window.location.
 */

import { stripAppBasePath } from "@/lib/appConfig";

const BASE = "";

export const userProductRoutes = {
  /** Canonical marketplace home. `/dashboard` is a supported alias of the same UI. */
  dashboard: () => (BASE ? BASE : "/"),
  list: (query?: Record<string, string>) => {
    const path = `${BASE}/list`;
    if (!query || Object.keys(query).length === 0) return path;
    const params = new URLSearchParams(query);
    return `${path}?${params.toString()}`;
  },
  view: (id: string, from?: "my-listings" | "buy-vehicle") => {
    const path = `${BASE}/viewproduct/${encodeURIComponent(id)}`;
    return from ? `${path}?from=${from}` : path;
  },
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
  assistant: () => `${BASE}/assistant`,
  featured: () => `${BASE}/featured`,
  featuredVehicles: () => `${BASE}/featured-vehicles`,
  purchases: () => `${BASE}/purchases`,
  contact: () => `${BASE}/contact`,
  legal: (type: "terms" | "privacy") => `${BASE}/legal/${type}`,
  profile: () => `${BASE}/profile`,
  login: (returnTo?: string) => {
    const path = `${BASE}/login`;
    if (!returnTo?.trim()) return path;
    return `${path}?returnTo=${encodeURIComponent(returnTo.trim())}`;
  },
  register: (returnTo?: string) => {
    const path = `${BASE}/register`;
    if (!returnTo?.trim()) return path;
    return `${path}?returnTo=${encodeURIComponent(returnTo.trim())}`;
  },
} as const;

export function getUserProductBasePath(): string {
  return BASE || "/";
}

/** Paths for sell / listings hub (header + mobile nav active state). */
export function isSellHubPath(pathname: string): boolean {
  const path = stripAppBasePath(pathname).split("?")[0];
  return (
    path.startsWith(`${BASE}/my-listings`) ||
    path.startsWith(`${BASE}/create`) ||
    path.startsWith(`${BASE}/edit`)
  );
}
