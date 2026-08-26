/**
 * Public deployment path for the User Portal.
 *
 * The marketplace is served at the host root (`/` locally and in production).
 * Do not set a `/user` prefix here — old `/user/...` URLs redirect in next.config.ts.
 * Do not use .env for these values.
 */

/** Public URL prefix. Empty so pages live at `/`, `/list`, `/dashboard`. */
export const APP_BASE_PATH: string = "";

export const PUBLIC_URL_PREFIX = "";

/** Old production prefix. Strip from image/page URLs so `/user/assets/...` still loads. */
const LEGACY_PUBLIC_PREFIX = "/user";

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

function stripLegacyPublicPrefix(pathname: string): string {
  let p = pathname || "/";
  if (APP_BASE_PATH) {
    if (p === APP_BASE_PATH || p === `${APP_BASE_PATH}/`) return "/";
    if (p.startsWith(`${APP_BASE_PATH}/`)) p = p.slice(APP_BASE_PATH.length) || "/";
  }
  if (p === LEGACY_PUBLIC_PREFIX || p === `${LEGACY_PUBLIC_PREFIX}/`) return "/";
  if (p.startsWith(`${LEGACY_PUBLIC_PREFIX}/`)) {
    return p.slice(LEGACY_PUBLIC_PREFIX.length) || "/";
  }
  return p;
}

/**
 * Prefix a same-origin public path (`/images`, `/assets`) when APP_BASE_PATH
 * is set. Currently empty — paths stay `/images/...`. Old `/user/...` paths
 * are stripped so logos and vehicle fallbacks keep loading.
 */
export function withAppBasePath(path: string): string {
  if (!path) return APP_BASE_PATH || "/";
  if (path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const parsed = new URL(path);
      const stripped = stripLegacyPublicPrefix(parsed.pathname);
      if (stripped === parsed.pathname) return path;
      parsed.pathname = stripped;
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return path;
    }
  }
  const { pathname, search } = splitPathAndSearch(path);
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const stripped = stripLegacyPublicPrefix(normalized);
  if (!APP_BASE_PATH) return `${stripped}${search}`;
  if (stripped === APP_BASE_PATH || stripped.startsWith(`${APP_BASE_PATH}/`)) {
    return `${stripped}${search}`;
  }
  return `${APP_BASE_PATH}${stripped}${search}`;
}

/** Strip `/user` (and APP_BASE_PATH) so values match `usePathname()` / `router.push()`. */
export function stripAppBasePath(path: string): string {
  if (!path) return "/";
  const { pathname, search } = splitPathAndSearch(path);
  const p = stripLegacyPublicPrefix(pathname || "/");
  return `${p}${search}`;
}

/** Next.js App Router API routes that live under this portal (e.g. Places proxy). */
export function nextAppApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return withAppBasePath(normalized);
}
