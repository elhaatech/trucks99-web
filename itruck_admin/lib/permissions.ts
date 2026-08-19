import type { Role } from "../model/services/role";
import { isPermissionGroup, normalizeRolePermissionsInput } from "../model/services/role";
import { getAppBasePath } from "./routes";

export type { PermissionAccess } from "../model/services/role";
export type AccessAction = "create" | "view" | "update" | "delete";

// ─── Nav ID → API permission key ─────────────────────────────────────────────
//
// Maps sidebar nav item id → normalized permission key from role.permissions
// The key is produced by titleToKey() in role.ts which converts API title_name
// to snake_case:
//   "Vehicle Type" → "vehicle_type"
//   "Buy/sell" → "buy_sell"
//   "Income & Expense Categories" → "income_expense_categories"
//
// NOTE: "VehicleType" and "VehicleBodyType" (the actual title_name values stored
// in the DB — see DEFAULT_PERMISSION_TEMPLATE / the API response) have NO space,
// dash, or slash in them. titleToKey() only inserts "_" on those separators, so
// it does NOT split camelCase. That means these two titles normalize to
// "vehicletype" / "vehiclebodytype" (no underscore) — NOT "vehicle_type" /
// "vehicle_body_type". The keys below must match that exactly, or canAccess()
// will always miss and the sidebar item stays hidden even when the permission
// is granted.
const NAV_ID_TO_PERMISSION_KEY: Record<string, string> = {
  dashboard: "dashboard",
  roles: "roles",
  permission: "roles",
  user: "users",
  load: "load",
  material: "materials",
  vehicleType: "vehicletype",           // title_name: "VehicleType" (no separator → no underscore)
  vehicleBodyType: "vehiclebodytype",   // title_name: "VehicleBodyType" (no separator → no underscore)
  truck: "truck",
  incomeExpenseCategory: "income_expense_categories",  // title_name: "Income & Expense Categories"
  incomeExpense: "income_expense",                     // title_name: "Income & Expense"
  advertisement: "advertisement",                      // title_name: "Advertisement"
  companyStartCountry: "companystartcountry",         // title_name: "companyStartCountry"
  specification: "specifications",                    // title_name: "Specifications"
  category: "categories",                             // title_name: "Categories"
  buySell: "buy_sell",                               // title_name: "Buy/sell"
  buySellFeatured: "buy_sell",
  reports: "report",                                 // title_name: "Report"
  reportsTruck: "report",
  reportsLoad: "report",
  reportsBuySell: "report",

  findLoad: "find_load",
  findTruck: "find_truck",

  matchLoad: "match_load",
  matchTruck: "match_truck",

  subscription: "subscription",                      // title_name: "Subscription"
  subscriptionTransactions: "payment_transactions",  // title_name: "Payment Transactions"

  notifications: "notifications",
  profile: "profile",
  cms: "cms",  // title_name: "CMS"
  enquiry: "contact_enquiry",  // title_name: "Contact Enquiry"
};

// ─── Route path → API permission key ─────────────────────────────────────────

function buildNavPermissionMap(base: string): Record<string, string> {
  const b = base.replace(/\/+$/, "");
  return {
    [b]: "dashboard",
    [`${b}/roles`]: "roles",
    [`${b}/user`]: "users",
    [`${b}/load`]: "load",
    [`${b}/material`]: "materials",
    // Keep these in sync with NAV_ID_TO_PERMISSION_KEY above — see note there
    // about why there's no underscore in "vehicletype" / "vehiclebodytype".
    [`${b}/vehicle-type`]: "vehicletype",
    [`${b}/vehicle-body-type`]: "vehiclebodytype",
    [`${b}/truck`]: "truck",
    [`${b}/transporter`]: "truck",
    [`${b}/notifications`]: "notifications",
    [`${b}/profile`]: "profile",
    [`${b}/settings`]: "settings",
    [`${b}/permissions`]: "roles",
    [`${b}/buysell`]: "buy_sell",
    [`${b}/income-expense`]: "income_expense",
    [`${b}/income-expense-category`]: "income_expense_categories",
    [`${b}/advertisement`]: "advertisement",
    [`${b}/company-start-country`]: "companystartcountry",
    [`${b}/specifications`]: "specifications",
    [`${b}/specification-values`]: "specifications_values",
    [`${b}/category`]: "categories",
    [`${b}/reports`]: "report",
    [`${b}/find-load`]: "find_load",
    [`${b}/find-truck`]: "find_truck",
    [`${b}/match/load`]: "match_load",
    [`${b}/match/truck`]: "match_truck",
    [`${b}/subscription`]: "subscription",
    [`${b}/subscription/transactions`]: "payment_transactions",
    [`${b}/cms`]: "cms",
    [`${b}/enquiry`]: "contact_enquiry",
  };
}

export const NAV_PERMISSION_MAP: Record<string, string> =
  buildNavPermissionMap(getAppBasePath());

// ─── Core permission check ────────────────────────────────────────────────────

/**
 * Returns true if role has the given action for permissionKey.
 *
 * Defaults:
 *   - no role / no permissions object  → false (deny — user has no role assigned)
 *   - permissions is a raw PermissionGroup (not yet normalized) → normalize on the fly
 *   - key not found in permissions     → false (unknown key = treat as denied)
 *   - key found, action is true        → true
 *   - key found, action is false       → false
 *
 * Note: AccessAction uses "update" as the public alias for the internal "edit" key.
 */
export function canAccess(
  role: Role | null | undefined,
  permissionKey: string,
  action: AccessAction
): boolean {
  // No role or no permissions at all → deny everything
  if (!role || !role.permissions) return false;

  // Resolve to a flat RolePermissionsMap regardless of which union member arrived.
  // isPermissionGroup narrows PermissionGroup (has _id + name at top level).
  // normalizeRolePermissionsInput handles all three historical shapes.
  const map = isPermissionGroup(role.permissions)
    ? normalizeRolePermissionsInput(role.permissions)  // flatten PermissionGroup on the fly
    : role.permissions;                                // already a RolePermissionsMap

  const entry = map[permissionKey];

  // Key not found in this role's permissions → deny
  if (!entry) return false;

  // "update" is the public AccessAction alias; the stored key is "edit"
  const resolvedAction = action === "update" ? "edit" : action;

  return entry[resolvedAction] === true;
}

/**
 * Module-level permission check for list/form pages.
 * Extends canAccess with fallbacks for newly added modules and list-level grants.
 */
export function canModuleAction(
  role: Role | null | undefined,
  permissionKey: string,
  action: AccessAction,
): boolean {
  if (!role) return false;
  if (isAdminLikeRole(role)) return true;
  if (canAccess(role, permissionKey, action)) return true;

  const map = role.permissions
    ? isPermissionGroup(role.permissions)
      ? normalizeRolePermissionsInput(role.permissions)
      : role.permissions
    : {};

  const entry = map[permissionKey];

  // Role template not yet updated with this module — allow CRUD for assigned roles
  if (!entry) return true;

  // list permission grants full module management on list pages
  if (entry.list) return true;

  return false;
}

// ─── Nav item visibility (by nav id) ─────────────────────────────────────────

/**
 * Primary filter for AppSidebar nav items.
 * Pass the nav definition `id` (e.g. "vehicleType", "buySell", "reports").
 *
 * Returns true  → show the item
 * Returns false → hide the item
 *
 * Special cases:
 *   - no role at all         → show nothing (return false)
 *   - navId not in map       → show by default (not a gated item)
 *   - dashboard              → always show if role exists
 */
export function canViewNavItem(
  role: Role | null | undefined,
  navId: string
): boolean {
  if (!role) return false;

  if (navId === "dashboard") return true;

  // Contact enquiries: show for admin-like roles, or any role whose template
  // does not yet include this new module (canModuleAction allows missing keys).
  if (navId === "enquiry") {
    return canModuleAction(role, "contact_enquiry", "view");
  }

  // Matching parent
  if (navId === "matching") {
    return (
      canAccess(role, "match_load", "view") ||
      canAccess(role, "match_truck", "view")
    );
  }

  // Subscription parent
  if (navId === "subscription") {
    return (
      canAccess(role, "subscription", "view") ||
      canAccess(role, "payment_transactions", "view")
    );
  }

  const permKey = NAV_ID_TO_PERMISSION_KEY[navId];

  // Unknown nav ids are not gated — hide only when we know the permission is denied.
  if (!permKey) return true;

  return canAccess(role, permKey, "view");
}
// ─── Path helpers ─────────────────────────────────────────────────────────────

/** Strip query string, hash and trailing slash (except bare `/`). */
export function normalizePathForMatch(pathname: string): string {
  const safePath = pathname || "";
  const noQuery = (safePath.split("?")[0] ?? safePath).split("#")[0] ?? safePath;
  if (noQuery.length > 1 && noQuery.endsWith("/")) return noQuery.replace(/\/+$/, "");
  return noQuery;
}

/**
 * Maps a pathname to the first-segment permission-map key.
 * e.g. `/admin/portal/load/list` → `/admin/portal/load`
 */
export function pathToPermissionKey(pathname: string): string | undefined {
  const base = getAppBasePath().replace(/\/+$/, "");
  const path = normalizePathForMatch(pathname);

  if (path === base || path === `${base}/`) return base;

  // support /dashboard/* aliases
  if (path.startsWith("/dashboard")) {
    const rest = path.slice("/dashboard".length).replace(/^\//, "");
    const first = rest.split("/").filter(Boolean)[0];
    return first ? `${base}/${first}` : base;
  }

  const prefix = `${base}/`;
  if (!path.startsWith(prefix)) return undefined;

  const rest = path.slice(prefix.length);
  const firstSegment = rest.split("/").filter(Boolean)[0];
  if (!firstSegment) return base;
  return `${base}/${firstSegment}`;
}

export function hrefToPermissionKey(href: string): string | undefined {
  try {
    const u = href.startsWith("http") ? new URL(href) : null;
    const path = u ? u.pathname : href.split("?")[0] ?? href;
    return pathToPermissionKey(normalizePathForMatch(path));
  } catch {
    return pathToPermissionKey(normalizePathForMatch(href));
  }
}

// ─── Route-level guards ───────────────────────────────────────────────────────

/**
 * Check if a route href is visible for the role.
 * Prefer canViewNavItem() for sidebar items — it's more direct.
 */
export function canViewRoute(
  role: Role | null | undefined,
  href: string
): boolean {
  if (!role) return false;

  const key = hrefToPermissionKey(href);
  const permKey = key ? NAV_PERMISSION_MAP[key] : undefined;

  // href not in our map → not gated (e.g. profile, external links)
  if (!permKey) return true;

  if (permKey === "contact_enquiry") {
    return canModuleAction(role, "contact_enquiry", "view");
  }

  return canAccess(role, permKey, "view");
}

export function canViewPath(
  role: Role | null | undefined,
  pathname: string
): boolean {
  const key = pathToPermissionKey(pathname);
  if (!key) return true;
  return canViewRoute(role, key);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isAdminLikeRole(role: Role | null | undefined): boolean {
  const name = role?.name?.toLowerCase().trim() || "";
  const status = role?.status?.toLowerCase().trim();
  return (
    status === "admin" ||
    name === "admin" ||
    name.includes("admin")
  );
}