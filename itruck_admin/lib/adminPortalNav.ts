import { Role, User } from "@/model/api";
import { routes } from "./routes";

/**
 * Sidebar / deep-link targets for the admin portal.
 * Hrefs come from `routes` in `lib/routes.ts` (BASE = `NEXT_PUBLIC_APP_BASE` or `/admin/portal`).
 */
export type AdminPortalNavDef = {
  id: string;
  label: string;
  getHref: () => string;
  appFolder: string;
  children?: AdminPortalNavDef[];
};

/**
 * Maps nav item id → the exact title_name string used in DEFAULT_PERMISSION_TEMPLATE.
 * These must match what the API stores — copy them verbatim from DEFAULT_PERMISSION_TEMPLATE.
 */
const NAV_ID_TO_TITLE_NAME: Record<string, string> = {
  dashboard: "Dashboard",
  roles: "Roles",
  permission: "permission",
  user: "Users",
  incomeExpenseCategory: "Income & Expense Categories",
  incomeExpense: "Income & Expense",
  advertisement: "Advertisement",
  companyStartCountry: "companyStartCountry",
  specification: "Specifications",
  category: "Categories",
  buySell: "Buy/sell",
  findLoad: "Find Load",
  findTruck: "Find Truck",
  reports: "Report",
  subscription: "Subscription",
  matching: "matching",
  matchLoad: "match_load",
  matchTruck: "match_truck",
  cms: "CMS",
  enquiry: "Contact Enquiry",
  favorites: "Favorites",
};

/**
 * Resolve the human-readable label for a nav item.
 *
 * Handles two shapes of role.permissions:
 *
 * 1. PermissionGroup array — raw API response before normalization.
 *    Each item has { title_name, display_name, access }.
 *    Find by title_name and return display_name.
 *
 * 2. RolePermissionsMap — flat object after normalizeRolePermissionsInput.
 *    After the role.ts fix, each entry carries display_name and title_name.
 *    Scan values and match by title_name.
 *
 * Falls back to defaultLabel if nothing matched.
 */
function getLabel(
  navId: string,
  role: Role | null | undefined,
  defaultLabel: string
): string {
  if (!role?.permissions) return defaultLabel;

  const titleName = NAV_ID_TO_TITLE_NAME[navId];
  if (!titleName) return defaultLabel;

  const perms = role.permissions as unknown;

  // ── Shape 1: raw PermissionGroup array ──────────────────────────────────────
  if (Array.isArray(perms)) {
    const match = (perms as Array<any>).find(
      (p) => p && p.title_name === titleName
    );
    return match?.display_name || defaultLabel;
  }

  // ── Shape 2: RolePermissionsMap (flat object) ────────────────────────────────
  // normalizeRolePermissionsInput now preserves title_name + display_name on each entry.
  if (typeof perms === "object" && perms !== null) {
    const permMap = perms as Record<string, any>;
    for (const entry of Object.values(permMap)) {
      if (entry && entry.title_name === titleName && entry.display_name) {
        return entry.display_name;
      }
    }
  }

  return defaultLabel;
}

export function getAdminPortalNavDefinitions(
  role: Role | null,
  userId: string,
  user: User | null | undefined
): AdminPortalNavDef[] {
  return [
    {
      id: "dashboard",
      label: getLabel("dashboard", role, "Dashboard"),
      getHref: () => routes.dashboard(),
      appFolder: "page.tsx (portal home)",
    },

    {
      id: "permission",
      label: getLabel("permission", role, "Permissions"),
      getHref: () => routes.permission.list(),
      appFolder: "permissions/list",
    },
    {
      id: "roles",
      label: getLabel("roles", role, "Roles"),
      getHref: () => routes.role.list(),
      appFolder: "roles/list",
    },
    {
      id: "user",
      label: getLabel("user", role, "Users"),
      getHref: () => routes.user.list(),
      appFolder: "user",
      children: [
        {
          id: "activeUsers",
          label: "Active Users",
          getHref: () => routes.user.list(),
          appFolder: "user/list",
        },
        {
          id: "deletedUsers",
          label: "Deleted Users",
          getHref: () => routes.user.deleted(),
          appFolder: "user/deleted",
        },
      ],
    },
    {
      id: "enquiry",
      label: getLabel("enquiry", role, "Enquiry"),
      getHref: () => routes.enquiry.list(),
      appFolder: "/enquiry/list",
    },
    {
      id: "favorites",
      label: getLabel("favorites", role, "Favorites"),
      getHref: () => routes.favorites.list(),
      appFolder: "/favorites/list",
    },
    {
      id: "incomeExpenseCategory",
      label: getLabel("incomeExpenseCategory", role, "Income & Expense Category"),
      getHref: () => routes.incomeExpenseCategory.list(),
      appFolder: "income-expense-category/list",
    },
    {
      id: "advertisement",
      label: getLabel("advertisement", role, "Advertisement"),
      getHref: () => routes.advertisement.list(),
      appFolder: "advertisement/list",
    },
    {
      id: "incomeExpense",
      label: getLabel("incomeExpense", role, "Income & Expense"),
      getHref: () => routes.incomeExpense.list(),
      appFolder: "income-expense/list",
    },
    {
      id: "specification",
      label: getLabel("specification", role, "Specifications"),
      getHref: () => routes.specification.list(),
      appFolder: "specifications/list",
    },
    {
      id: "category",
      label: getLabel("category", role, "Category"),
      getHref: () => routes.category.list(),
      appFolder: "specification-values/list",
    },
    {
      id: "buySell",
      label: getLabel("buySell", role, "Buy / Sell"),
      getHref: () => routes.buysell.list(),
      appFolder: "/buysell/list",
      children: [
        {
          id: "buySell",
          label: "Listings",
          getHref: () => routes.buysell.list(),
          appFolder: "/buysell/list",
        },
        {
          id: "buySellFeatured",
          label: "Featured Vehicles",
          getHref: () => routes.buysell.featuredVehicles(),
          appFolder: "/buysell/featured-vehicles",
        },
      ],
    },
    {
      id: "findLoad",
      label: getLabel("findLoad", role, "Find Load"),
      getHref: () => routes.findLoad.list(),
      appFolder: "find-load",
    },
    {
      id: "findTruck",
      label: getLabel("findTruck", role, "Find Truck"),
      getHref: () => routes.findTruck.list(),
      appFolder: "find-truck",
    },
    {
      id: "reports",
      label: getLabel("reports", role, "Reports"),
      getHref: () => routes.reports.list(),
      appFolder: "/reports",
      children: [
        {
          id: "reportsTruck",
          label: "Truck Report",
          getHref: () => routes.reports.truck(),
          appFolder: "/reports/truck",
        },
        {
          id: "reportsLoad",
          label: "Load Report",
          getHref: () => routes.reports.load(),
          appFolder: "/reports/load",
        },
        {
          id: "reportsBuySell",
          label: "Buy/Sell Report",
          getHref: () => routes.reports.buySell(),
          appFolder: "/reports/buy/sell",
        },
      ],
    },
    {
      id: "subscription",
      label: getLabel("subscription", role, "Subscription"),
      getHref: () => routes.subscription.list(),
      appFolder: "/subscription",
      children: [
        {
          id: "subscription",
          label: "Packages",
          getHref: () => routes.subscription.list(),
          appFolder: "/subscription",
        },
        {
          id: "subscriptionTransactions",
          label: "Transactions",
          getHref: () => routes.subscription.transactions(),
          appFolder: "/subscription/transactions",
        },
      ],
    },
    {
      id: "matching",
      label: getLabel("matching", role, "Matching"),
      getHref: () => "#",
      appFolder: "/matching",
      children: [
        {
          id: "matchLoad",
          label: "Match Load",
          getHref: () => routes.match_load.list(),
          appFolder: "/matching/load",
        },
        {
          id: "matchTruck",
          label: "Match Truck",
          getHref: () => routes.match_truck.list(),
          appFolder: "/matching/truck",
        },
      ],
    },
    {
      id: "cms",
      label: getLabel("cms", role, "CMS"),
      getHref: () => routes.cms.list(),
      appFolder: "/cms",
    },
  ];
}