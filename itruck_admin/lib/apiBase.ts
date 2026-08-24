import {
  LOCAL_BACKEND_PORT,
  PRODUCTION_API_ORIGIN,
  PRODUCTION_HOSTS,
} from "@/lib/appConfig";

/**
 * Backend always runs on port 3003.
 * itruck_admin UI may run on 3004 — never send OTP/API calls to the UI port.
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

/** If a URL points at a Next.js UI port, rewrite it to the backend port. */
export function forceBackendPort(url: string): string {
  const trimmed = stripSlash(url);
  try {
    const parsed = new URL(trimmed);
    if (
      (isLoopbackHost(parsed.hostname) || isPrivateLan(parsed.hostname)) &&
      parsed.port !== BACKEND_PORT
    ) {
      parsed.port = BACKEND_PORT;
    }
    if (parsed.pathname && parsed.pathname !== "/") {
      return `${parsed.origin}${parsed.pathname}${parsed.search}`;
    }
    return parsed.origin;
  } catch {
    return trimmed.replace(/:(3000|3001|3002|3004|3005)(?=\/|$)/, `:${BACKEND_PORT}`);
  }
}

/**
 * Resolve backend API base URL.
 * Local / LAN always uses :3003. Production uses https://trucks99.elhaa.com.
 */
export function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;

    if (isLoopbackHost(hostname) || isPrivateLan(hostname)) {
      return `${protocol}//${hostname}:${BACKEND_PORT}`;
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
