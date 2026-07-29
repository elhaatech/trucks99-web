import { getAuthHeaders } from "@/model/services/common";
import { getCurrentUser } from "@/model/services/user";
import { setReturnUrl } from "@/lib/navigation/navigation";
import { userProductRoutes } from "@/lib/userProductRoutes";

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

export async function isMarketplaceUserLoggedIn(): Promise<boolean> {
  if (!getAuthHeaders().Authorization) return false;
  try {
    const user = await getCurrentUser();
    return Boolean(user?.id || user?._id);
  } catch {
    return false;
  }
}

type EnsureLoginActions = {
  notify?: (payload: { type: "error"; message: string }) => void;
  onNeedLogin?: (loginPath: string) => void;
};

/**
 * Returns true when the user may open a vehicle detail page.
 * Sets return URL so the app can send them back after login.
 */
export async function ensureLoggedInToViewProduct(
  productId: string,
  actions: EnsureLoginActions = {},
): Promise<boolean> {
  if (await isMarketplaceUserLoggedIn()) return true;

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
