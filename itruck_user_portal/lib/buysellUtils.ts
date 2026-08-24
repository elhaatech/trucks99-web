import { withAppBasePath } from "@/lib/appConfig";
import { resolvePublicFileUrl } from "@/lib/fileUrl";

/** Public fallback used whenever a Buy/Sell vehicle image is missing or fails to load. */
export const DEFAULT_VEHICLE_IMAGE = withAppBasePath("/assets/dtruck.png");

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
  return resolvePublicFileUrl(path);
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
