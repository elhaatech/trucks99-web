import { getAppBasePath } from "@/lib/routes";

/** Pages that show inline Google Ads and the session popup. */
export function isGoogleAdEligiblePage(pathname?: string | null): boolean {
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
  ];

  return patterns.some((pattern) => pattern.test(path));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
