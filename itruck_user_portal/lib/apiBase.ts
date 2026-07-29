/**
 * Resolve backend API base URL.
 * - On truck.elhaa.com / server IP → same host port 3003
 * - On localhost → always local backend (even if production build baked remote URL)
 */
export function resolveApiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1";

    if (isLocal) {
      if (fromEnv && /localhost|127\.0\.0\.1/i.test(fromEnv)) {
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
