/**
 * Marketplace feature barrel — stable import surface for portal pages.
 * Implementation still lives in existing modules (no behavior change).
 */

export {
  getBuySellList,
  getBuySellListPage,
  getBuySellDashboardStats,
  getBuySellFeaturedVehicles,
  getBuySellRecentVehicles,
  getBuySellProduct,
  getBuySellRowId,
  unwrapBuySellListResponse,
  type BuySellProduct,
  type BuySellListFilter,
  type BuySellListPage,
  type BuySellDashboardStatsResponse,
} from "@/model/services/buysellapi";

export {
  addFavorite,
  removeFavorite,
  listBuySellFavoriteProducts,
  getBuySellFavoriteCount,
} from "@/model/services/favoriteapi";

export { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
export { userProductRoutes } from "@/lib/userProductRoutes";
export { toBuySellListPayload, filterBuySellBySearch } from "@/lib/buySellListUtils";
export { MARKETPLACE, BUY_SELL_ENTITY } from "@/constants/marketplace";
