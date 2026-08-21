import { resolveApiBase } from "@/lib/apiBase";
import { APP_BASE_PATH, withAppBasePath } from "@/lib/appConfig";

/** Public fallback used whenever a Buy/Sell vehicle image is missing or fails to load. */
export const DEFAULT_VEHICLE_IMAGE = withAppBasePath("/assets/dtruck.png");

const LOCAL_STATIC_PREFIXES = [
  "/assets/",
  "/images/",
  "/_next/",
  `${APP_BASE_PATH}/assets/`,
  `${APP_BASE_PATH}/images/`,
  `${APP_BASE_PATH}/_next/`,
];

function isLocalStaticPath(path: string): boolean {
  return LOCAL_STATIC_PREFIXES.some(
    (prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix),
  );
}

function isDefaultVehicleSrc(src: string): boolean {
  if (!src) return false;
  try {
    const pathname = src.startsWith("http://") || src.startsWith("https://")
      ? new URL(src).pathname
      : src.split("?")[0];
    return (
      pathname === DEFAULT_VEHICLE_IMAGE ||
      pathname.endsWith("/assets/dtruck.png")
    );
  } catch {
    return src.includes("/assets/dtruck.png");
  }
}

/**
 * Resolve a stored image path from the API to a browser URL.
 * Uses the current host API base (localhost or truck.elhaa.com) — no hardcoded hosts/paths.
 * Absolute http(s) URLs from the API are returned as-is.
 * Local public assets such as `/assets/dtruck.png` are not prefixed with the API base.
 */
export function getBuySellImageUrl(path?: string | null): string {
  if (path == null) return "";
  let trimmed = String(path).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return trimmed;

  // Collapse accidental double-prefix: http://hosthttp://host/path
  const doubled = trimmed.match(/^(https?:\/\/[^/\s]+)(https?:\/\/\S+)$/i);
  if (doubled) trimmed = doubled[2];

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (isLocalStaticPath(normalized)) return withAppBasePath(normalized);

  const base = resolveApiBase().replace(/\/$/, "");
  return `${base}${normalized}`;
}

/**
 * Resolve a single vehicle image for display. Empty/invalid paths become the default truck image.
 */
export function resolveVehicleImageSrc(path?: string | null): string {
  return getBuySellImageUrl(path) || DEFAULT_VEHICLE_IMAGE;
}

/**
 * Safely resolve the first valid image URL from a product's `images` field.
 * Returns the default vehicle image when `images` is missing, null, not an array,
 * or contains only empty/invalid entries.
 */
export function getFirstBuySellImageUrl(images?: unknown): string {
  const list = Array.isArray(images) ? images : [];
  const firstImage = list.find(
    (img) => typeof img === "string" && img.trim() !== "",
  );
  return firstImage
    ? resolveVehicleImageSrc(firstImage)
    : DEFAULT_VEHICLE_IMAGE;
}

/**
 * Resolve every usable image in a gallery. If none are usable, returns the default image.
 */
export function getBuySellImageUrls(images?: unknown): string[] {
  const list = Array.isArray(images) ? images : [];
  const urls = list
    .filter((img): img is string => typeof img === "string" && img.trim() !== "")
    .map((img) => getBuySellImageUrl(img))
    .filter(Boolean);
  return urls.length > 0 ? urls : [DEFAULT_VEHICLE_IMAGE];
}

/**
 * Swap a broken/404 image for the default truck photo. Safe to call repeatedly.
 */
export function handleBuySellImageError(event: {
  currentTarget?: HTMLImageElement;
  target?: EventTarget | null;
}): void {
  const img = (event.currentTarget || event.target) as HTMLImageElement | undefined;
  if (!img || typeof img.src !== "string") return;
  if (img.dataset.fallbackApplied === "1") return;
  if (isDefaultVehicleSrc(img.src) || img.src.endsWith(DEFAULT_VEHICLE_IMAGE)) {
    img.dataset.fallbackApplied = "1";
    return;
  }
  img.dataset.fallbackApplied = "1";
  img.onerror = null;
  img.src = DEFAULT_VEHICLE_IMAGE;
}
