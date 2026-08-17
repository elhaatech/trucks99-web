/**
 * Backend always runs on port 3003.
 * itruck_admin UI may run on 3000/3001 — never send OTP/API calls to the UI port.
 */
const BACKEND_PORT = "3003";
const FRONTEND_PORTS = new Set(["3000", "3001", "3002", "3004", "3005", ""]);

function stripSlash(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function portOf(url: string): string {
  try {
    return new URL(url).port;
  } catch {
    const m = url.match(/:(\d+)(?:\/|$)/);
    return m?.[1] || "";
  }
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
 * Local / LAN always uses :3003. Env values that point at the Next.js UI port are ignored.
 */
export function resolveApiBase(): string {
  const fromEnv = stripSlash(process.env.NEXT_PUBLIC_API_URL || "");

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;

    if (isLoopbackHost(hostname) || isPrivateLan(hostname)) {
      return `${protocol}//${hostname}:${BACKEND_PORT}`;
    }

    const isDeployedHost =
      hostname === "truck.elhaa.com" ||
      hostname === "www.truck.elhaa.com" ||
      hostname === "46.202.176.124";

    if (isDeployedHost) {
      if (fromEnv) {
        try {
          const envHost = new URL(fromEnv).hostname;
          if (!isLoopbackHost(envHost) && !FRONTEND_PORTS.has(portOf(fromEnv))) {
            return fromEnv;
          }
        } catch {
          /* ignore invalid env URL */
        }
      }
      return `${protocol}//${hostname}:${BACKEND_PORT}`;
    }
  }

  if (fromEnv) return forceBackendPort(fromEnv);
  return `http://localhost:${BACKEND_PORT}`;
}
