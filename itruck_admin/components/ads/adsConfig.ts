/** Google AdSense configuration — set in .env.local for production ads. */
export const GOOGLE_ADS_CLIENT =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT?.trim() ||
  "ca-app-pub-3940256099942544";

export const GOOGLE_ADS_INLINE_SLOT =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_INLINE_SLOT?.trim() || "9214589741";

export const GOOGLE_ADS_POPUP_SLOT =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_POPUP_SLOT?.trim() || "1033173712";

export const GOOGLE_ADS_INLINE_UNIT = `${GOOGLE_ADS_CLIENT}/${GOOGLE_ADS_INLINE_SLOT}`;
export const GOOGLE_ADS_POPUP_UNIT = `${GOOGLE_ADS_CLIENT}/${GOOGLE_ADS_POPUP_SLOT}`;

/** Google's official sample publisher id — safe for local/test rendering. */
export const IS_GOOGLE_ADS_TEST_MODE =
  GOOGLE_ADS_CLIENT === "ca-app-pub-3940256099942544";

/**
 * Master switch for rendering advertisement blocks across the whole site.
 * Set to `true` to re-enable all ad banners, slots, and popups.
 */
export const SHOW_ADS = true;

export function isLocalDevelopmentHost(hostname?: string): boolean {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/** Show a visible placeholder when real ads cannot render (localhost / test client). */
export function shouldShowAdPlaceholder(hostname?: string): boolean {
  if (IS_GOOGLE_ADS_TEST_MODE) return true;
  if (process.env.NODE_ENV === "development") {
    return isLocalDevelopmentHost(hostname);
  }
  return false;
}

/** Enable AdSense test mode on localhost when using a production publisher id. */
export function shouldUseAdTestMode(hostname?: string): boolean {
  if (IS_GOOGLE_ADS_TEST_MODE) return false;
  return isLocalDevelopmentHost(hostname);
}
