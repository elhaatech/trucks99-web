import { api } from "./common";
import type { ApiUser } from "./user";

/** Access flags for a permission (server returns only true values). */
export type PermissionAccess = {
  create?: boolean;
  view?: boolean;
  list?: boolean;
  edit?: boolean;
  delete?: boolean;
  update?: boolean; // alias for edit
};

export type PermissionItem = {
  title_name: string;
  display_name: string;
  access?: PermissionAccess;
};

export type PermissionGroup = {
  _id: string;
  id?: string; // uuid when available
  name: string;
  permissions: PermissionItem[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const DEFAULT_PERMISSION_TEMPLATE: PermissionItem[] = [
  { title_name: "Dashboard", display_name: "Dashboard", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Roles", display_name: "Roles", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Users", display_name: "Users", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Load", display_name: "Load", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Materials", display_name: "Materials", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "VehicleType", display_name: "Vehicle Type", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "VehicleBodyType", display_name: "Vehicle Body Type", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Truck", display_name: "Truck", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Income & Expense Categories", display_name: "Income & Expense Categories", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Advertisement", display_name: "Advertisement", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Income & Expense", display_name: "Income & Expense", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Specifications", display_name: "Specifications", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "companyStartCountry", display_name: "Company Start Country", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Specifications Values", display_name: "Specifications Values", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Categories", display_name: "Categories", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Sub-Categories", display_name: "Sub Categories", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Buy/sell", display_name: "Buy / Sell", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Report", display_name: "Report", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Profile", display_name: "Profile", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Notifications", display_name: "Notifications", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Settings", display_name: "Settings", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Subscription", display_name: "Packages", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "Payment Transactions", display_name: "Transactions", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "match_load", display_name: "Load", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "match_truck", display_name: "Truck", access: { create: false, view: false, edit: false, delete: false, list: false } },
  { title_name: "permission", display_name: "Permission", access: { create: false, view: false, edit: false, delete: false, list: false } }
];

export async function getPermissions(params?: { search?: string }): Promise<PermissionGroup[]> {
  const payload = params?.search?.trim() ? { search: params.search.trim() } : {};
  return api<PermissionGroup[]>("/api/permission", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPermissionById(id: string): Promise<PermissionGroup> {
  return api<PermissionGroup>(`/api/permission/${id}`);
}

export async function createPermission(body: {
  name: string;
  permissions: PermissionItem[];
  description?: string;
  user?: ApiUser;
}) {
  return api<{
    message: string;
    newPerm?: PermissionGroup;
  }>("/api/permission/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePermission(id: string, body: {
  name?: string;
  permissions: PermissionItem[];
  description?: string;
  user?: ApiUser;
}) {
  return api<{ message: string; permission?: PermissionGroup }>(`/api/permission/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deletePermission(name: string, user?: ApiUser) {
  return api<{ message: string }>("/api/permission/delete", {
    method: "DELETE",
    body: JSON.stringify({ name, user }),
  });
}

