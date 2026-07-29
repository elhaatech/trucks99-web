import { API_BASE } from "@/model/services/common";

/** Resolve a stored path like `/uploads/foo.jpg` to a full API URL. */
export function getBuySellImageUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = API_BASE.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
