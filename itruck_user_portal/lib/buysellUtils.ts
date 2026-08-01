import { resolveApiBase } from "@/lib/apiBase";

/**
 * Resolve a stored image path from the API to a browser URL.
 * Uses the current host API base (localhost or truck.elhaa.com) — no hardcoded hosts/paths.
 * Absolute http(s) URLs from the API are returned as-is.
 */
export function getBuySellImageUrl(path?: string | null): string {
  if (!path) return "";
  const trimmed = String(path).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const base = resolveApiBase().replace(/\/$/, "");
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${normalized}`;
}
