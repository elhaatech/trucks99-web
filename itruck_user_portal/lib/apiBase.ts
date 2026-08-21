import {
  LOCAL_BACKEND_PORT,
  PRODUCTION_API_ORIGIN,
} from "@/lib/appConfig";

/**
 * Resolve backend API origin (no trailing slash).
 * Paths in service files already start with `/api/...`.
 *
 * - localhost / private LAN → local backend on port 3003
 * - production and SSR → https://trucks99.elhaa.com
 *
 * Do not send browser calls to `/user/api/...`. Backend routes are `/api/...`.
 */
export function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;

    const isLoopback = hostname === "localhost" || hostname === "127.0.0.1";

    const isPrivateLan =
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

    if (isLoopback || isPrivateLan) {
      return `${protocol}//${hostname}:${LOCAL_BACKEND_PORT}`;
    }
  }

  return PRODUCTION_API_ORIGIN;
}
