/**
 * Browser storage keys used by the marketplace portal.
 * Keep in one place to avoid magic strings and typos.
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: "itruck_token",
  MARKETPLACE_USER_ID: "itruck_marketplace_user_id",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Auth/session keys only — never wipe guest, nav, or preference storage. */
export const AUTH_STORAGE_KEYS: readonly StorageKey[] = [
  STORAGE_KEYS.AUTH_TOKEN,
  STORAGE_KEYS.MARKETPLACE_USER_ID,
];

/** Remove logged-in auth data without touching unrelated localStorage keys. */
export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}
