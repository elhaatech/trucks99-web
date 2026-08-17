import { IS_GOOGLE_ADS_TEST_MODE } from "./adsConfig";

const POPUP_SESSION_KEY = "itruck_google_ad_popup_shown";
const LEGACY_POPUP_KEY = POPUP_SESSION_KEY;

function dismissKey(pathname: string): string {
  return `itruck_ad_popup_dismissed_${pathname}`;
}

/** Clear legacy global dismiss flag so test mode popups work per-page. */
export function preparePopupSession(pathname: string): void {
  if (typeof window === "undefined") return;
  if (IS_GOOGLE_ADS_TEST_MODE) {
    sessionStorage.removeItem(LEGACY_POPUP_KEY);
  }
}

export function wasPopupDismissedThisSession(pathname: string): boolean {
  if (typeof window === "undefined") return false;

  if (IS_GOOGLE_ADS_TEST_MODE) {
    return sessionStorage.getItem(dismissKey(pathname)) === "1";
  }

  return (
    sessionStorage.getItem(POPUP_SESSION_KEY) === "1" ||
    sessionStorage.getItem(dismissKey(pathname)) === "1"
  );
}

export function markPopupDismissedThisSession(pathname: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(dismissKey(pathname), "1");
  if (!IS_GOOGLE_ADS_TEST_MODE) {
    sessionStorage.setItem(POPUP_SESSION_KEY, "1");
  }
}
