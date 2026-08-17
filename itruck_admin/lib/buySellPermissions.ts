import type { BuySellProduct } from "@/model/services/buysellapi";
import type { User } from "@/model/services/user";
import { isAdminLikeRole } from "@/lib/permissions";

export const NON_EDITABLE_BUY_SELL_STATUSES = new Set([
  "sold",
  "booking",
  "purchased",
]);

function extractId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object" && value !== null) {
    const obj = value as { _id?: unknown; id?: unknown };
    if (obj._id) return String(obj._id);
    if (obj.id) return String(obj.id);
  }
  return String(value);
}

function normalizeComparableId(value: unknown): string | null {
  const id = extractId(value);
  if (!id) return null;
  return id.trim().toLowerCase();
}

function collectUserIds(user: User | null, currentUserId: string | null): Set<string> {
  const ids = new Set<string>();
  const add = (value: unknown) => {
    const normalized = normalizeComparableId(value);
    if (normalized) ids.add(normalized);
  };
  add(currentUserId);
  add(user?.id);
  add(user?._id);
  return ids;
}

export function getBuySellCurrentUserId(user: User | null): string | null {
  if (!user) return null;
  return extractId(user._id ?? user.id);
}

export function isProductOwner(
  product: BuySellProduct,
  user: User | null,
  currentUserId: string | null,
): boolean {
  const sellerId = normalizeComparableId(product.userid);
  if (!sellerId) return false;
  return collectUserIds(user, currentUserId).has(sellerId);
}

function isBuySellAdminUser(user: User | null): boolean {
  if (!user) return false;
  if (isAdminLikeRole(user.role ?? null)) return true;
  const email = user.email?.toLowerCase().trim();
  return email === "admin@mail.com";
}

/** True when the logged-in seller may purchase "Feature Your Vehicle" for this listing. */
export function canFeatureOwnBuySellListing(
  product: BuySellProduct,
  user: User | null,
): boolean {
  if (!user || !product) return false;
  const currentUserId = getBuySellCurrentUserId(user);
  if (!isProductOwner(product, user, currentUserId)) return false;
  const status = (product.status ?? "").toLowerCase().trim();
  return !NON_EDITABLE_BUY_SELL_STATUSES.has(status);
}

/** True when the user is an admin or the listing owner (and status allows edit). */
export function canEditBuySellProduct(
  product: BuySellProduct,
  user: User | null,
): boolean {
  if (!product) return false;
  if (isBuySellAdminUser(user)) return true;

  const currentUserId = getBuySellCurrentUserId(user);
  const isOwner = isProductOwner(product, user, currentUserId);
  const status = (product.status ?? "").toLowerCase().trim();

  return isOwner && !NON_EDITABLE_BUY_SELL_STATUSES.has(status);
}