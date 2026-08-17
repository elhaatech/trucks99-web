/**
 * Central route paths for the admin portal.
 * Pattern: {BASE}/{model} (list), {BASE}/{model}/create, {BASE}/{model}/edit/{id}, {BASE}/{model}/view/{id}
 * You can override BASE via NEXT_PUBLIC_APP_BASE (e.g. "/admin/portal").
 */

import { report } from "process";

/** Normalized app base path (no trailing slash). Used by sidebar permission + active-state logic — must match link hrefs. */
export function getAppBasePath(): string {
  const raw = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_BASE) || "/admin/portal";
  let s = String(raw).trim();
  if (!s) return "/admin/portal";
  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      s = new URL(s).pathname;
    } catch {
      s = "/admin/portal";
    }
  }
  if (!s.startsWith("/")) s = `/${s}`;
  s = s.replace(/\/+$/, "");
  return s || "/admin/portal";
}

const BASE = getAppBasePath();

/**
 * Typed route constants (same paths as `routes`, string form for comparisons / links).
 * Prefer these in new code alongside `routes.*()` where a plain string is needed.
 */
export const ROUTES = {
  load: {
    list: `${BASE}/load/list`,
    create: `${BASE}/load/create`,
    edit: (id: string) => `${BASE}/load/edit/${id}`,
    view: (id: string) => `${BASE}/load/view/${id}`,
  },
  incomeExpense: {
    /** Canonical list URL (matches `routes.incomeExpense.list()`). */
    list: `${BASE}/income-expense/list`,
  },
  incomeExpenseCategory: {
    list: `${BASE}/income-expense-category/list`,
  },
  advertisement: {
    list: `${BASE}/advertisement/list`,
  },
} as const;

export const routes = {
  // User
  user: {
    list: () => `${BASE}/user/list`,
    create: () => `${BASE}/user/create`,
    edit: (id: string) => `${BASE}/user/edit/${id}`,
    view: (id: string) => `${BASE}/user/view/${id}`,
  },
  match_load: {
    list: () => `${BASE}/match/load`,

  },
  match_truck: {
    list: () => `${BASE}/match/truck`,

  },
  // Roles
  role: {
    list: () => `${BASE}/roles/list`,
    create: () => `${BASE}/roles/create`,
    edit: (id: string) => `${BASE}/roles/edit/${id}`,
    view: (id: string) => `${BASE}/roles/view/${id}`,
  },
  subscription: {
    list: () => `${BASE}/subscription/list`,
    create: () => `${BASE}/subscription/create`,
    edit: (id: string) => `${BASE}/subscription/edit/${id}`,
    view: (id: string) => `${BASE}/subscription/view/${id}`,
    transactions: () => `${BASE}/subscription/transactions`,
    transactionView: (id: string) => `${BASE}/subscription/transactions/view/${id}`,

  },
  cms: {
    list: () => `${BASE}/cms/list`,
    create: () => `${BASE}/cms/create`,
    view: (id: string) => `${BASE}/cms/${id}`,
    edit: (id: string) => `${BASE}/cms/${id}/edit`,
  },
  // Product
  // Load
  load: {
    list: () => `${BASE}/load/list`,
    create: () => `${BASE}/load/create`,
    edit: (id: string) => `${BASE}/load/edit/${id}`,
    view: (id: string) => `${BASE}/load/view/${id}`,
  },
  category: {
    list: () => "/admin/portal/category/list",
    create: () => "/admin/portal/category/create",
    view: (id: string) => `/admin/portal/category/view/${id}`,
    edit: (id: string) => `/admin/portal/category/edit/${id}`,
  },
  transaction: {
    list: () => "/transactions",
    view: (id: string) => `/transactions/${id}`,
  },
  login: () => "/",
  register: () => "/register",
  subCategory: {
    list: (categoryId: string) =>
      `/admin/portal/category/list/${categoryId}/sub-category/list`,

    create: (categoryId: string) =>
      `/admin/portal/category/list/${categoryId}/sub-category/create`,

    view: (categoryId: string, id: string) =>
      `/admin/portal/category/list/${categoryId}/sub-category/view/${id}`,

    edit: (categoryId: string, id: string) =>
      `/admin/portal/category/list/${categoryId}/sub-category/edit/${id}`,
  },
  buysell: {
    list: () => `${BASE}/buysell/list`,
    create: () => `${BASE}/buysell/create`,
    edit: (id: string) => `${BASE}/buysell/edit/${id}`,
    view: (id: string) => `${BASE}/buysell/view/${id}`,
    purchasedList: () => `${BASE}/buysell/list/purchasedProductslist`,
    cart: () => `${BASE}/buysell/cart`,
    featuredVehicles: () => `${BASE}/buysell/featured-vehicles`,
  },
  // Material
  material: {
    list: () => `${BASE}/material/list`,
    create: () => `${BASE}/material/create`,
    edit: (id: string) => `${BASE}/material/edit/${id}`,
    view: (id: string) => `${BASE}/material/view/${id}`,
  },
  // Vehicle Type
  vehicleType: {
    list: () => `${BASE}/vehicle-type/list`,
    create: () => `${BASE}/vehicle-type/create`,
    edit: (id: string) => `${BASE}/vehicle-type/edit/${id}`,
    view: (id: string) => `${BASE}/vehicle-type/view/${id}`,
  },
  // Vehicle Body Type
  vehicleBodyType: {
    list: () => `${BASE}/vehicle-body-type/list`,
    create: () => `${BASE}/vehicle-body-type/create`,
    edit: (id: string) => `${BASE}/vehicle-body-type/edit/${id}`,
    view: (id: string) => `${BASE}/vehicle-body-type/view/${id}`,
  },
  // Truck
  truck: {
    list: () => `${BASE}/truck/list`,
    create: () => `${BASE}/truck/create`,
    edit: (id: string) => `${BASE}/truck/edit/${id}`,
    view: (id: string) => `${BASE}/truck/view/${id}`,
    route: (id: string) => `${BASE}/truck/route/${id}`,
  },
  // Transporter / Driver
  transporter: {
    list: () => `${BASE}/transporter`,
    create: () => `${BASE}/transporter/create`,
    edit: (id: string) => `${BASE}/transporter/edit/${id}`,
    view: (id: string) => `${BASE}/transporter/view/${id}`,
  },
  // Permissions
  permission: {
    list: () => `${BASE}/permissions`,
    create: () => `${BASE}/permissions/create`,
    edit: (id: string) => `${BASE}/permissions/edit/${id}`,
    view: (id: string) => `${BASE}/permissions/view/${id}`,
  },
  // Income & Expense Category
  incomeExpenseCategory: {
    list: () => `${BASE}/income-expense-category/list`,
    create: () => `${BASE}/income-expense-category/create`,
    edit: (id: string) => `${BASE}/income-expense-category/edit/${id}`,
    view: (id: string) => `${BASE}/income-expense-category/view/${id}`,
  },
  advertisement: {
    list: () => `${BASE}/advertisement/list`,
    create: () => `${BASE}/advertisement/create`,
    edit: (id: string) => `${BASE}/advertisement/edit/${id}`,
    view: (id: string) => `${BASE}/advertisement/view/${id}`,
  },
  // Company Start Country
  companyStartCountry: {
    list: () => `${BASE}/company-start-country/list`,
    create: () => `${BASE}/company-start-country/create`,
    edit: (id: string) => `${BASE}/company-start-country/edit/${id}`,
    view: (id: string) => `${BASE}/company-start-country/view/${id}`,
  },
  specification: {
    list: () => `${BASE}/specifications/list`,
    create: () => `${BASE}/specifications/create`,
    edit: (id: string) => `${BASE}/specifications/edit/${id}`,
    view: (id: string) => `${BASE}/specifications/view/${id}`,
    values: (id: string) => `${BASE}/specifications/values/${id}`,
  },
  specificationValue: {
    list: () => `${BASE}/specification-values/list`,
    create: () => `${BASE}/specification-values/create`,
    edit: (id: string) => `${BASE}/specification-values/edit/${id}`,
    view: (id: string) => `${BASE}/specification-values/view/${id}`,
  },
  // Income & Expense (entries)
  incomeExpense: {
    list: () => `${BASE}/income-expense/list`,
    create: () => `${BASE}/income-expense/create`,
    edit: (id: string) => `${BASE}/income-expense/edit/${id}`,
    view: (id: string) => `${BASE}/income-expense/view/${id}`,
  },
  findLoad: {
    list: () => `${BASE}/find-load`,
  },
  findTruck: {
    list: () => `${BASE}/find-truck`,
  },
  reports: {
    list: () => `${BASE}/reports`,
    truck: () => `${BASE}/reports/truck`,
    load: () => `${BASE}/reports/load`,
    buySell: () => `${BASE}/reports/buy/sell`,
  },
  // Other fixed routes
  dashboard: () => BASE,
  notifications: () => `${BASE}/notifications`,
  notificationHistory: () => `${BASE}/notifications/history`,
  notificationTemplates: () => `${BASE}/notifications/templates`,
  profile: () => `${BASE}/profile`,
  settings: () => `${BASE}/settings`,
} as const;
