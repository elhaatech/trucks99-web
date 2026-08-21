import { userProductRoutes } from "@/lib/userProductRoutes";
import { stripAppBasePath } from "@/lib/appConfig";

const DASHBOARD = userProductRoutes.dashboard();
const LIST = userProductRoutes.list();

/** Pages that are top-level hubs — no shell back button. */
const HUB_PATHS = new Set([DASHBOARD, "/", "/dashboard"]);

export function shouldShowBuySellBack(pathname: string): boolean {
  const path = stripAppBasePath(pathname).split("?")[0];
  if (HUB_PATHS.has(path)) return false;
  if (path.includes("/viewproduct/")) return false;
  return true;
}

/** Safe fallback when browser history / nav stack is empty. */
export function getBuySellBackFallback(pathname: string): string {
  const path = stripAppBasePath(pathname).split("?")[0];
  if (path.includes("/edit/")) {
    const id = path.split("/edit/")[1]?.split("/")[0];
    return id ? userProductRoutes.view(id) : userProductRoutes.sellVehicle();
  }
  if (path.includes("/viewproduct/")) return LIST;
  if (path.startsWith("/seller/")) return LIST;
  if (path === LIST) return DASHBOARD;
  if (path.startsWith("/my-listings")) return DASHBOARD;
  if (path === userProductRoutes.cart() || path === userProductRoutes.favorites()) {
    return DASHBOARD;
  }
  if (
    path === userProductRoutes.offers() ||
    path === userProductRoutes.purchases() ||
    path === userProductRoutes.emi() ||
    path === userProductRoutes.chat() ||
    path === userProductRoutes.featured() ||
    path === userProductRoutes.featuredVehicles()
  ) {
    return DASHBOARD;
  }
  return DASHBOARD;
}
