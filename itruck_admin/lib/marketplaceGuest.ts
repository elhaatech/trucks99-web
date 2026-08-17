const GUEST_KEY_STORAGE = "itruck_marketplace_guest_key";

/** Stable anonymous id for buy/sell offers (no login / OTP / token). */
export function getOrCreateGuestKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(GUEST_KEY_STORAGE);
  if (!key) {
    key =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(GUEST_KEY_STORAGE, key);
  }
  return key;
}
