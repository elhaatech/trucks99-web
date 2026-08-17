import { userProductRoutes } from "@/lib/userProductRoutes";

const DASHBOARD = userProductRoutes.dashboard();
const LIST = userProductRoutes.list();

/** Pages that are top-level hubs — no shell back button. */
const HUB_PATHS = new Set([DASHBOARD, "/usear/product"]);

export function shouldShowBuySellBack(pathname: string): boolean {
  if (!pathname.startsWith("/usear/product")) return false;
  if (HUB_PATHS.has(pathname)) return false;
  // Product view uses gallery overlay back control
  if (pathname.includes("/viewproduct/")) return false;
  return true;
}

/** Safe fallback when browser history / nav stack is empty. */
export function getBuySellBackFallback(pathname: string): string {
  if (pathname.includes("/edit/")) {
    const id = pathname.split("/edit/")[1]?.split("/")[0];
    return id ? userProductRoutes.view(id) : userProductRoutes.sellVehicle();
  }
  if (pathname.includes("/viewproduct/")) return LIST;
  if (pathname.startsWith("/usear/product/seller/")) return LIST;
  if (pathname === LIST) return DASHBOARD;
  if (pathname.startsWith("/usear/product/my-listings")) return DASHBOARD;
  if (pathname === userProductRoutes.cart() || pathname === userProductRoutes.favorites()) {
    return DASHBOARD;
  }
  if (
    pathname === userProductRoutes.offers() ||
    pathname === userProductRoutes.purchases() ||
    pathname === userProductRoutes.emi() ||
    pathname === userProductRoutes.chat() ||
    pathname === userProductRoutes.featured()
  ) {
    return DASHBOARD;
  }
  return DASHBOARD;
}
