import type { User } from "@/model/services/user";
import { getAuthHeaders } from "@/model/services/getAuthHeaders";
import {
  getMarketplaceUserId,
  persistMarketplaceUserId,
} from "@/lib/marketplaceUser";

export const MARKETPLACE_AUTH_CHANGED_EVENT = "itruck-marketplace-auth-changed";
export const MARKETPLACE_FAVORITES_CHANGED_EVENT =
  "itruck-marketplace-favorites-changed";
export const MARKETPLACE_CHAT_CHANGED_EVENT = "itruck-marketplace-chat-changed";

/** Stores the name the user actually typed on the sign-in form, since the
 *  OTP backend can return the mobile number (or nothing) as `name`. The header
 *  binds to this so "Sri" shows as "Sri" rather than falling back to "User". */
export const MARKETPLACE_SIGNIN_NAME_KEY =
  "trucks99_marketplace_signin_name";

export function persistMarketplaceSignInName(name?: string | null): void {
  if (typeof window === "undefined") return;
  const trimmed = name?.trim();
  try {
    if (trimmed) {
      window.localStorage.setItem(MARKETPLACE_SIGNIN_NAME_KEY, trimmed);
    } else {
      window.localStorage.removeItem(MARKETPLACE_SIGNIN_NAME_KEY);
    }
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export function getMarketplaceSignInName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(MARKETPLACE_SIGNIN_NAME_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

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

/** Notify header inbox badge after a chat room is created or a message is sent. */
export function notifyMarketplaceChatChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MARKETPLACE_CHAT_CHANGED_EVENT));
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

/** Display name for the logged-in user. OTP-only accounts that sign in without
 *  a name get the mobile number stored back as the name, so any value that
 *  looks like a phone number is treated as "no name" and falls back to a
 *  friendly placeholder instead of leaking the number into the UI. */
export function getMarketplaceDisplayName(
  user: { name?: string | null } | null | undefined,
  fallback = "User",
): string {
  // Prefer the name the user actually entered on the sign-in form, persisted
  // after login. The OTP backend may return the mobile number (or nothing) as
  // `name`, which we must not surface as the display name.
  const signInName = getMarketplaceSignInName();
  if (signInName) return signInName;
  const name = user?.name?.trim();
  if (name && !/^\+?\d[\d\s-]{8,}$/.test(name)) return name;
  return fallback;
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
