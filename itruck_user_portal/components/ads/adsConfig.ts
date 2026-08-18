/**
 * Google AdSense configuration.
 *
 * Truck99_Web_Responsive
 * data-ad-client="ca-pub-2600927533607135"
 * data-ad-slot="6835182258"
 */

export const GOOGLE_ADS_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT?.trim() ||
  "ca-pub-2600927533607135";

/** Truck99_Web_Responsive display unit. */
export const DEFAULT_ADSENSE_SLOT =
  process.env.NEXT_PUBLIC_ADSENSE_SLOT?.trim() || "6835182258";

export type AdSensePlacement =
  | "dashboard"
  | "listing"
  | "myListing"
  | "details"
  | "featured"
  | "seller"
  | "purchases"
  | "popup";

function slotEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

/**
 * Per-placement slot IDs. Falls back to Truck99_Web_Responsive (6835182258)
 * until you create separate units in AdSense.
 */
export const ADSENSE_SLOTS: Record<AdSensePlacement, string> = {
  dashboard:
    slotEnv("NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD") || DEFAULT_ADSENSE_SLOT,
  listing: slotEnv("NEXT_PUBLIC_ADSENSE_SLOT_LISTING") || DEFAULT_ADSENSE_SLOT,
  myListing: slotEnv("NEXT_PUBLIC_ADSENSE_SLOT_MY_LISTING") || DEFAULT_ADSENSE_SLOT,
  details: slotEnv("NEXT_PUBLIC_ADSENSE_SLOT_DETAILS") || DEFAULT_ADSENSE_SLOT,
  featured: slotEnv("NEXT_PUBLIC_ADSENSE_SLOT_FEATURED") || DEFAULT_ADSENSE_SLOT,
  seller: slotEnv("NEXT_PUBLIC_ADSENSE_SLOT_SELLER") || DEFAULT_ADSENSE_SLOT,
  purchases: slotEnv("NEXT_PUBLIC_ADSENSE_SLOT_PURCHASES") || DEFAULT_ADSENSE_SLOT,
  popup: slotEnv("NEXT_PUBLIC_ADSENSE_SLOT_POPUP") || "",
};

export function getAdSenseSlot(placement?: AdSensePlacement): string {
  if (!placement) return DEFAULT_ADSENSE_SLOT;
  return ADSENSE_SLOTS[placement] || DEFAULT_ADSENSE_SLOT;
}

export const GOOGLE_ADS_INLINE_SLOT = ADSENSE_SLOTS.listing || DEFAULT_ADSENSE_SLOT;
export const GOOGLE_ADS_POPUP_SLOT = ADSENSE_SLOTS.popup;

export const GOOGLE_ADS_INLINE_UNIT = `${GOOGLE_ADS_CLIENT}/${GOOGLE_ADS_INLINE_SLOT}`;
export const GOOGLE_ADS_POPUP_UNIT = GOOGLE_ADS_POPUP_SLOT
  ? `${GOOGLE_ADS_CLIENT}/${GOOGLE_ADS_POPUP_SLOT}`
  : GOOGLE_ADS_CLIENT;

export const IS_GOOGLE_ADS_TEST_MODE =
  GOOGLE_ADS_CLIENT === "ca-app-pub-3940256099942544";

export function isLocalDevelopmentHost(hostname?: string): boolean {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function shouldShowAdPlaceholder(): boolean {
  return false;
}

/** Enable AdSense test ads on localhost so units can fill during local testing. */
export function shouldUseAdTestMode(hostname?: string): boolean {
  if (IS_GOOGLE_ADS_TEST_MODE) return false;
  return isLocalDevelopmentHost(hostname);
}
