const TOKEN_KEY = "itruck_token";
const USER_ID_KEY = "itruck_marketplace_user_id";

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

/** Remember marketplace user id for buy/sell flows without requiring GET /api/user. */
export function persistMarketplaceUserId(userId: string): void {
  if (typeof window === "undefined" || !userId.trim()) return;
  localStorage.setItem(USER_ID_KEY, userId.trim());
}

export function clearMarketplaceUserId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_ID_KEY);
}

/** User id for marketplace offers/listings when auth token is not sent or is expired. */
export function getMarketplaceUserId(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(USER_ID_KEY);
  if (stored?.trim()) return stored.trim();
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return decodeJwtUserId(token);
  return null;
}
