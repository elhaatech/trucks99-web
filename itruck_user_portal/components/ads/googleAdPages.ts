import { getAppBasePath } from "@/lib/routes";

/**
 * Pages that may show the admin Google Ad popup.
 * Marketplace inline ads are placed explicitly via GoogleAdBanner.
 */
export function isGoogleAdEligiblePage(pathname: string): boolean {
  const base = getAppBasePath().replace(/\/+$/, "");
  const path = (pathname || "").replace(/\/+$/, "") || base;

  if (path === base) return true;

  const patterns = [
    new RegExp(`^${escapeRegex(base)}/find-load$`),
    new RegExp(`^${escapeRegex(base)}/load/list$`),
    new RegExp(`^${escapeRegex(base)}/load/view/[^/]+$`),
    new RegExp(`^${escapeRegex(base)}/truck/list$`),
    new RegExp(`^${escapeRegex(base)}/truck/view/[^/]+$`),
    new RegExp(`^${escapeRegex(base)}/buysell/list$`),
    new RegExp(`^${escapeRegex(base)}/buysell/view/[^/]+$`),
    new RegExp(`^${escapeRegex(base)}/buysell/featured-vehicles$`),
  ];

  return patterns.some((pattern) => pattern.test(path));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
