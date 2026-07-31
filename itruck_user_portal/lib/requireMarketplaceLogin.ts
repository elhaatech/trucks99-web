import { getAuthHeaders } from "@/model/services/common";
import { setReturnUrl } from "@/lib/navigation/navigation";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { hasMarketplaceBearerToken } from "@/lib/marketplaceAuth";

export function getMarketplaceLoginPath(returnTo?: string): string {
  const fromEnv =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_LOGIN_PATH : undefined;
  if (fromEnv?.trim()) {
    const base = fromEnv.trim();
    if (returnTo?.trim()) {
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}returnTo=${encodeURIComponent(returnTo.trim())}`;
    }
    return base;
  }
  return userProductRoutes.login(returnTo);
}

/**
 * Fast sync check — token present. Prefer MarketplaceAuthProvider for full user.
 * Avoids an extra GET /api/user on every product click when shell already authenticated.
 */
export function isMarketplaceTokenPresent(): boolean {
  return hasMarketplaceBearerToken() || Boolean(getAuthHeaders().Authorization);
}

export async function isMarketplaceUserLoggedIn(): Promise<boolean> {
  return isMarketplaceTokenPresent();
}

type EnsureLoginActions = {
  notify?: (payload: { type: "error"; message: string }) => void;
  onNeedLogin?: (loginPath: string) => void;
  /** When provided by a page inside MarketplaceAuthProvider, skip network. */
  isLoggedIn?: boolean;
  authReady?: boolean;
};

/**
 * Returns true when the user may open a vehicle detail page.
 * Sets return URL so the app can send them back after login.
 *
 * When `authReady` is false, returns false without redirecting (caller should wait).
 */
export async function ensureLoggedInToViewProduct(
  productId: string,
  actions: EnsureLoginActions = {},
): Promise<boolean> {
  if (typeof actions.isLoggedIn === "boolean") {
    if (actions.authReady === false) return false;
    if (actions.isLoggedIn) return true;
  } else if (isMarketplaceTokenPresent()) {
    return true;
  }

  const returnPath = userProductRoutes.view(productId);
  if (typeof window !== "undefined") {
    setReturnUrl(returnPath);
  }

  actions.notify?.({
    type: "error",
    message: "Please sign in to view this vehicle.",
  });
  actions.onNeedLogin?.(getMarketplaceLoginPath(returnPath));
  return false;
}
