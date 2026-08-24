/**
 * Public deployment path and production API origin for the User Portal.
 *
 * Local pages stay at http://localhost:3002/ (no `/user` prefix).
 * Production assets are prefixed via NEXT_PUBLIC_ASSET_PREFIX=/user in
 * `.env.production` (see next.config.ts). Page routes stay host-root
 * because Apache already maps /user/* onto this process.
 */

/** Next.js `basePath` — empty so pages stay at `/` internally. */
export const APP_BASE_PATH: string = "";

/**
 * Existing production backend origin used by this portal.
 * Backend routes stay at `/api/...` on this host.
 */
export const PRODUCTION_API_ORIGIN = "https://trucks99.elhaa.com";

/** Local `server_trucks99` port (browser on localhost / LAN only). */
export const LOCAL_BACKEND_PORT = "3003";

function splitPathAndSearch(path: string): { pathname: string; search: string } {
  const q = path.indexOf("?");
  if (q === -1) return { pathname: path, search: "" };
  return { pathname: path.slice(0, q), search: path.slice(q) };
}

/**
 * Prefix a same-origin public path with the app base path for raw `<img>`,
 * fetch, and service-worker URLs. `next/link`, `next/image`, and `router.push`
 * already apply `basePath` — do not wrap those.
 */
export function withAppBasePath(path: string): string {
  if (!path) return APP_BASE_PATH || "/";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  const { pathname, search } = splitPathAndSearch(path);
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!APP_BASE_PATH) return `${normalized}${search}`;
  if (normalized === APP_BASE_PATH || normalized.startsWith(`${APP_BASE_PATH}/`)) {
    return `${normalized}${search}`;
  }
  return `${APP_BASE_PATH}${normalized}${search}`;
}

/** Strip the app base path so values match `usePathname()` / `router.push()`. */
export function stripAppBasePath(path: string): string {
  if (!path) return "/";
  const { pathname, search } = splitPathAndSearch(path);
  let p = pathname || "/";
  if (!APP_BASE_PATH) return `${p}${search}`;
  if (p === APP_BASE_PATH || p === `${APP_BASE_PATH}/`) {
    p = "/";
  } else if (p.startsWith(`${APP_BASE_PATH}/`)) {
    p = p.slice(APP_BASE_PATH.length) || "/";
  }
  return `${p}${search}`;
}

/** Next.js App Router API routes that live under this portal (e.g. Places proxy). */
export function nextAppApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return withAppBasePath(normalized);
}
