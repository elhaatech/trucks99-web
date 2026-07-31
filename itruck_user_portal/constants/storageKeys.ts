/**
 * Browser storage keys used by the marketplace portal.
 * Keep in one place to avoid magic strings and typos.
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: "itruck_token",
  MARKETPLACE_USER_ID: "itruck_marketplace_user_id",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
