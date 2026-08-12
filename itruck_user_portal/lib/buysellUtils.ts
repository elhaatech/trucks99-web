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

/**
 * Safely resolve the first valid image URL from a product's `images` field.
 * Returns an empty string when `images` is missing, null, not an array,
 * or contains only empty/invalid entries.
 */
export function getFirstBuySellImageUrl(images?: unknown): string {
  const list = Array.isArray(images) ? images : [];
  const firstImage = list.find(
    (img) => typeof img === "string" && img.trim() !== ""
  );
  return firstImage ? getBuySellImageUrl(firstImage) : "";
}
