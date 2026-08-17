/**
 * Resolve backend API base URL.
 * - Deployed hosts → same origin (Next.js proxies /api/* to backend on :3003)
 * - localhost / LAN → host on port 3003
 * - Override anytime with NEXT_PUBLIC_API_URL
 */
export function resolveApiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { hostname, protocol, port } = window.location;

    const isLoopback =
      hostname === "localhost" || hostname === "127.0.0.1";

    /** Private LAN (e.g. http://192.168.x.x:3002) must use local API, not a baked production URL. */
    const isPrivateLan =
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

    if (isLoopback || isPrivateLan) {
      return `${protocol}//${hostname}:3003`;
    }

    const isDeployedHost =
      hostname === "truck.elhaa.com" ||
      hostname === "www.truck.elhaa.com" ||
      hostname === "46.202.176.124";

    if (isDeployedHost) {
      if (fromEnv) return fromEnv;
      const hostWithPort = port ? `${hostname}:${port}` : hostname;
      return `${protocol}//${hostWithPort}`;
    }
  }

  return fromEnv || "http://localhost:3003";
}
