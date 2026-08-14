import type { User } from "@/model/services/user";
import { getAuthHeaders } from "@/model/services/getAuthHeaders";
import {
  getMarketplaceUserId,
  persistMarketplaceUserId,
} from "@/lib/marketplaceUser";

export const MARKETPLACE_AUTH_CHANGED_EVENT = "itruck-marketplace-auth-changed";
export const MARKETPLACE_FAVORITES_CHANGED_EVENT =
  "itruck-marketplace-favorites-changed";

export function hasMarketplaceBearerToken(): boolean {
  return Boolean(getAuthHeaders().Authorization);
}

/** Notify shell + pages to reload user after login/logout. */
export function notifyMarketplaceAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MARKETPLACE_AUTH_CHANGED_EVENT));
}

/** Notify header badge (and listeners) after favorite add/remove. */
export function notifyMarketplaceFavoritesChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MARKETPLACE_FAVORITES_CHANGED_EVENT));
}

export function resolveMarketplaceUserIdFromUser(
  user: User | null | undefined,
): string | null {
  if (!hasMarketplaceBearerToken()) return null;
  if (user) {
    const id = String(user._id ?? user.id ?? "").trim();
    if (id) {
      persistMarketplaceUserId(id);
      return id;
    }
  }
  return getMarketplaceUserId();
}

export function toMarketplaceApiUser(user: User | null | undefined) {
  if (!user) return undefined;
  const role =
    typeof user.role === "string"
      ? { name: user.role }
      : user.role
        ? { name: (user.role as { name?: string }).name }
        : undefined;
  return {
    name: user.name,
    role,
  };
}
