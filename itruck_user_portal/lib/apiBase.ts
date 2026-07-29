/**
 * Resolve backend API base URL.
 * On the deployed host (truck.elhaa.com / server IP), always use the same
 * hostname on port 3003 — even if the build was made with localhost.
 */
export function resolveApiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
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
