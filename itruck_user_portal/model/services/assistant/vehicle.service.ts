/**
 * Thin wrappers around existing buy-sell APIs for the assistant layer.
 * Prefer importing from here in assistant hooks to avoid duplicate call sites.
 */
export {
  getBuySellList,
  getBuySellStatusCounts,
  getBuySellDashboardStats,
  getBuySellFeaturedVehicles,
  sellBuySellProduct,
  createBuySellProduct,
  updateBuySellProduct,
  deleteBuySellProducts,
  markBuySellProductSold,
  getBuySellRowId,
  type BuySellProduct,
  type BuySellCreatePayload,
  type BuySellStatusCounts,
} from "@/model/services/buysellapi";
