/**
 * Marketplace domain constants (UI + list defaults).
 * API contracts are unchanged — these only standardize client-side values.
 */
export const MARKETPLACE = {
  /** Default page size for vehicle grids (matches VehicleGrid). */
  VEHICLE_PAGE_SIZE: 12,
  /** Featured strip size on dashboard. */
  FEATURED_SECTION_LIMIT: 8,
  /** Recent vehicles strip size on dashboard. */
  RECENT_SECTION_LIMIT: 8,
  /** Browseable listing statuses on the public marketplace. */
  BROWSE_STATUSES: ["active", "pending"] as const,
  /** Client TTL hints (ms) — mirrors lib/apiCache usage. */
  CACHE_TTL_MS: {
    LIST: 15_000,
    CATEGORIES: 60_000,
    DASHBOARD_STATS: 15_000,
  },
} as const;

export const BUY_SELL_ENTITY = "buySell" as const;
