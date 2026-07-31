/**
 * Public service barrel. Prefer feature barrels for domain work;
 * use this for cross-cutting HTTP helpers.
 *
 * Avoid `export *` across all services — several modules share type names
 * (e.g. BulkUploadResult) which breaks TypeScript re-exports.
 */

export {
  api,
  publicApi,
  setToken,
  clearToken,
  getAuthHeaders,
  resolveApiBase,
  API_BASE,
} from "@/model/services/common";

export {
  getBuySellList,
  getBuySellListPage,
  getBuySellProduct,
  getBuySellDashboardStats,
  getBuySellFeaturedVehicles,
  getBuySellRecentVehicles,
  getBuySellRowId,
  type BuySellProduct,
  type BuySellListFilter,
  type BuySellListPage,
} from "@/model/services/buysellapi";

export {
  getCategories,
  type Category,
} from "@/model/services/category";

export {
  addFavorite,
  removeFavorite,
  listBuySellFavoriteProducts,
  getBuySellFavoriteCount,
} from "@/model/services/favoriteapi";
