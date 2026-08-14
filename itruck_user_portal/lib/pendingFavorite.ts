import { getCurrentPath } from "@/lib/navigation/navigation";

const PENDING_FAVORITE_KEY = "itruck:pendingFavorite";

export type PendingFavorite = {
  productId: string;
  returnTo: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function setPendingFavorite(productId: string, returnTo?: string): void {
  if (!isBrowser()) return;
  const id = productId.trim();
  if (!id) return;
  const payload: PendingFavorite = {
    productId: id,
    returnTo: (returnTo || getCurrentPath() || "/").trim() || "/",
  };
  sessionStorage.setItem(PENDING_FAVORITE_KEY, JSON.stringify(payload));
}

export function peekPendingFavorite(): PendingFavorite | null {
  if (!isBrowser()) return null;
  const raw = sessionStorage.getItem(PENDING_FAVORITE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingFavorite;
    const productId = String(parsed?.productId ?? "").trim();
    if (!productId) return null;
    return {
      productId,
      returnTo: String(parsed.returnTo ?? "").trim() || "/",
    };
  } catch {
    return null;
  }
}

export function consumePendingFavorite(): PendingFavorite | null {
  const pending = peekPendingFavorite();
  if (isBrowser()) sessionStorage.removeItem(PENDING_FAVORITE_KEY);
  return pending;
}

export function clearPendingFavorite(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(PENDING_FAVORITE_KEY);
}
