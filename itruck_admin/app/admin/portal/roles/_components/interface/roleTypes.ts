import type { PermissionAccess, RolePermission } from "@/model/api";

/**
 * Super Admin–style module permissions (API uses `update`; UI uses `edit`).
 * `title_name` values align with `canAccess(..., title, ...)` and `NAV_PERMISSION_MAP` where applicable.
 */
const SUPER_ADMIN_MODULE_ORDER: { key: string; title_name: string }[] = [
  { key: "dashboard", title_name: "Dashboard" },
  { key: "roles", title_name: "Roles" },
  { key: "users", title_name: "Users" },
  { key: "buyerseller", title_name: "Buy/Sell" },
  { key: "profile", title_name: "Profile" },
  { key: "notifications", title_name: "Notifications" },
  { key: "settings", title_name: "Settings" },
];

/** Raw CRUD flags per module key (matches backend `permissions` object shape). */
export const SUPER_ADMIN_PERMISSIONS_RECORD: Record<
  string,
  { create: boolean; view: boolean; update: boolean; delete: boolean }
> = {
  dashboard: { create: true, view: true, update: true, delete: true },
  roles: { create: true, view: true, update: true, delete: true },
  users: { create: true, view: true, update: true, delete: true },
  buyerseller: { create: true, view: true, update: true, delete: true },
  profile: { create: false, view: true, update: true, delete: false },
  notifications: { create: false, view: true, update: false, delete: false },
  settings: { create: false, view: true, update: true, delete: false },
};

/** Default rows for “Create role”: full Super Admin matrix, editable before submit. */
export function defaultCreateRolePermissions(): RolePermission[] {
  return SUPER_ADMIN_MODULE_ORDER.map(({ key, title_name }) => {
    const raw = SUPER_ADMIN_PERMISSIONS_RECORD[key];
    return {
      title_name,
      access: {
        create: Boolean(raw?.create),
        view: Boolean(raw?.view),
        edit: Boolean(raw?.update),
        delete: Boolean(raw?.delete),
      },
    };
  });
}

export interface FilterState {
  search: string;
}

export interface FormState {
  name: string;
  description: string;
  permissions: RolePermission[];
  newPermissionTitle: string;
}

/** Setter for one form field; use this on dialog props so generics match `useForm`’s `setFieldValue`. */
export type SetFormFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  permissions: [],
  newPermissionTitle: "",
};

export const EMPTY_FILTERS: FilterState = {
  search: "",
};

export function defaultAccess(): PermissionAccess {
  return { create: false, view: false, edit: false, delete: false };
}

