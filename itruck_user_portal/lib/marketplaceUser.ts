import { STORAGE_KEYS, clearAuthStorage } from "@/constants/storageKeys";

const TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN;
const USER_ID_KEY = STORAGE_KEYS.MARKETPLACE_USER_ID;

function decodeJwtUserId(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(padded)) as { id?: unknown; sub?: unknown };
    const id = json.id ?? json.sub;
    return id != null && String(id).trim() !== "" ? String(id) : null;
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  return token?.trim() ? token : null;
}

/** Remember marketplace user id for buy/sell flows without requiring GET /api/user. */
export function persistMarketplaceUserId(userId: string): void {
  if (typeof window === "undefined" || !userId.trim()) return;
  if (!getStoredToken()) return;
  localStorage.setItem(USER_ID_KEY, userId.trim());
}

export function clearMarketplaceUserId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_ID_KEY);
}

/** Token + user id used for marketplace auth. Leaves guest/nav keys intact. */
export function clearMarketplaceAuthStorage(): void {
  clearAuthStorage();
}

/**
 * User id for marketplace offers/listings.
 * Requires a live bearer token so a leftover userId cannot look like a session.
 */
export function getMarketplaceUserId(): string | null {
  if (typeof window === "undefined") return null;
  const token = getStoredToken();
  if (!token) return null;
  const stored = localStorage.getItem(USER_ID_KEY);
  if (stored?.trim()) return stored.trim();
  return decodeJwtUserId(token);
}
