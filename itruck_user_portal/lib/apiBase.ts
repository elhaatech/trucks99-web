/**
 * Resolve backend API base URL.
 * - localhost / 127.0.0.1 / private LAN → same host on port 3003
 * - truck.elhaa.com / server IP → same host port 3003
 * - Otherwise NEXT_PUBLIC_API_URL or localhost:3003
 */
export function resolveApiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;

    const isLoopback =
      hostname === "localhost" || hostname === "127.0.0.1";

    /** Private LAN (e.g. http://192.168.x.x:3002) must use local API, not a baked production URL. */
    const isPrivateLan =
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

    if (isLoopback || isPrivateLan) {
      if (isLoopback && fromEnv && /localhost|127\.0\.0\.1/i.test(fromEnv)) {
        return fromEnv;
      }
      return `${protocol}//${hostname}:3003`;
    }

    const isDeployedHost =
      hostname === "truck.elhaa.com" ||
      hostname === "www.truck.elhaa.com" ||
      hostname === "46.202.176.124";

    if (isDeployedHost) {
      return `${protocol}//${hostname}:3003`;
    }
  }

  return fromEnv || "http://localhost:3003";
}
