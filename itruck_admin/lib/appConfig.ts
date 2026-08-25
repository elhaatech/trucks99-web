/**
 * Public deployment path and production API origin for the Admin Portal.
 *
 * Apache serves this app at https://trucks99.elhaa.com/admin/ and strips `/admin`
 * before forwarding to port 3004, so Next.js pages stay at `/` and `/admin/portal`.
 * Do not set Next.js `basePath` to `/admin` — that would turn portal routes into
 * `/admin/admin/portal`.
 *
 * `assetPrefix` in next.config.ts makes `/_next` assets load from `/admin/_next`.
 * Do not use .env for these values.
 */

export const PUBLIC_URL_PREFIX = "/admin";

/** Public URL prefix for raw `/images` and `/assets` paths. Empty in `next dev`. */
export const APP_BASE_PATH: string =
  process.env.NODE_ENV === "production" ? "/admin" : "";

export const LOCAL_BACKEND_PORT = "3003";

export const PRODUCTION_HOSTS = new Set([
  "trucks99.elhaa.com",
  "www.trucks99.elhaa.com",
  "trucks99.com",
  "www.trucks99.com",
]);

function splitPathAndSearch(path: string): { pathname: string; search: string } {
  const q = path.indexOf("?");
  if (q === -1) return { pathname: path, search: "" };
  return { pathname: path.slice(0, q), search: path.slice(q) };
}

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
