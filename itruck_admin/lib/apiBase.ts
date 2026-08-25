import {
  LOCAL_BACKEND_PORT,
  PRODUCTION_API_ORIGIN,
  PRODUCTION_HOSTS,
} from "@/lib/appConfig";

/**
 * Backend always runs on port 3003.
 * In the browser on localhost / LAN, call the Next.js origin instead — `next.config.ts`
 * rewrites `/api/*` and `/uploads/*` to 127.0.0.1:3003. That avoids CORS
 * "Failed to fetch" when the UI is on :3004 and the API is on :3003.
 */
const BACKEND_PORT = LOCAL_BACKEND_PORT;

function stripSlash(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isPrivateLan(hostname: string): boolean {
  return (
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

function originFromUrl(parsed: URL): string {
  if (parsed.pathname && parsed.pathname !== "/") {
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  }
  return parsed.origin;
}

/** If a URL points at a Next.js UI port, rewrite it to the backend port. */
export function forceBackendPort(url: string): string {
  const trimmed = stripSlash(url);
  try {
    const parsed = new URL(trimmed);
    // Same-origin browser calls use the Next.js `/api` rewrite — do not hop to :3003.
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      return originFromUrl(parsed);
    }
    if (
      (isLoopbackHost(parsed.hostname) || isPrivateLan(parsed.hostname)) &&
      parsed.port !== BACKEND_PORT
    ) {
      parsed.port = BACKEND_PORT;
    }
    return originFromUrl(parsed);
  } catch {
    return trimmed.replace(/:(3000|3001|3002|3004|3005)(?=\/|$)/, `:${BACKEND_PORT}`);
  }
}

/**
 * Resolve backend API base URL.
 * Local / LAN browser → current origin (Next proxies `/api` to :3003).
 * Production → https://trucks99.elhaa.com.
 */
export function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;

    if (isLoopbackHost(hostname) || isPrivateLan(hostname)) {
      return window.location.origin;
    }

    if (PRODUCTION_HOSTS.has(hostname)) {
      return `${protocol}//${hostname}`;
    }

    const isLegacyHost =
      hostname === "truck.elhaa.com" ||
      hostname === "www.truck.elhaa.com" ||
      hostname === "46.202.176.124";

    if (isLegacyHost) {
      return `${protocol}//${hostname}:${BACKEND_PORT}`;
    }
  }

  return PRODUCTION_API_ORIGIN;
}
