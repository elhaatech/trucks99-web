import { withAppBasePath } from "@/lib/appConfig";
import { resolvePublicFileUrl } from "@/lib/fileUrl";

/** Public fallback used whenever a Buy/Sell vehicle image is missing or fails to load. */
export const DEFAULT_VEHICLE_IMAGE = withAppBasePath("/assets/semi-truck.jpg");

function isDefaultVehicleSrc(src: string): boolean {
  if (!src) return false;
  try {
    const pathname =
      src.startsWith("http://") || src.startsWith("https://")
        ? new URL(src).pathname
        : src.split("?")[0];
    return (
      pathname === DEFAULT_VEHICLE_IMAGE ||
      pathname.endsWith("/assets/semi-truck.jpg") ||
      pathname.endsWith("/assets/dtruck.png")
    );
  } catch {
    return (
      src.includes("/assets/semi-truck.jpg") || src.includes("/assets/dtruck.png")
    );
  }
}

/** Resolve a stored path like `/uploads/foo.jpg` to a full API URL. */
export function getBuySellImageUrl(path?: string | null): string {
  return resolvePublicFileUrl(path);
}

/** Resolve a single vehicle image for display. Empty/invalid paths become the default truck image. */
export function resolveVehicleImageSrc(path?: string | null): string {
  return getBuySellImageUrl(path) || DEFAULT_VEHICLE_IMAGE;
}

/**
 * Safely resolve the first valid image URL from a product's `images` field.
 * Returns the default vehicle image when `images` is missing, empty, or invalid.
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

/** Resolve every usable gallery image. If none are usable, returns the default image. */
export function getBuySellImageUrls(images?: unknown): string[] {
  const list = Array.isArray(images) ? images : [];
  const urls = list
    .filter((img): img is string => typeof img === "string" && img.trim() !== "")
    .map((img) => getBuySellImageUrl(img))
    .filter(Boolean);
  return urls.length > 0 ? urls : [DEFAULT_VEHICLE_IMAGE];
}

/** Swap a broken/404 image for the default truck photo. */
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
