import { api } from "./common";
import type { ApiUser } from "./user";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PermissionAccess = {
  create: boolean;
  view: boolean;
  edit: boolean;
  delete: boolean;
  update?: boolean; // alias for "edit" — included in input shapes but not stored in DB
  list: boolean;
};

/** A single row inside a Permission group's `permissions[]` array */
export type PermissionItem = {
  title_name: string;
  display_name: string;
  access: PermissionAccess;
};


/**
 * RolePermission — a single permission row used in form state and legacy API payloads.
 * Matches the shape roleTypes.ts and RoleForm use when building permissions arrays.
 */
export type RolePermission = {
  title_name: string;
  access?: Partial<PermissionAccess>;
};

/** A full Permission group document (as returned by GET /api/permission) */
export type PermissionGroup = {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  permissions: PermissionItem[];
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Flat permissions map produced by normalizeRolePermissionsInput.
 * Used when a role is embedded inside a User (getCurrentUser / verifyOtp).
 *
 * Each entry carries the full PermissionAccess PLUS the original
 * display_name and title_name so that sidebar labels can be resolved
 * without needing the raw PermissionGroup object.
 */
export type RolePermissionsMap = Record<
  string,
  PermissionAccess & {
    display_name?: string;
    title_name?: string;
  }
>;

/**
 * A Role document.
 *
 * `permissions` can be:
 *  - PermissionGroup      — fully populated object returned by getRoles
 *  - RolePermissionsMap   — flat key→access map after normalizeRolePermissionsInput
 *                           (role embedded inside getCurrentUser / verifyOtp response)
 *  - null | undefined     — not loaded
 */
export type Role = {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  status?: "admin" | "user";
  permissions?: PermissionGroup | RolePermissionsMap | null;
  createdAt?: string;
  updatedAt?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a fully-defaulted PermissionAccess object */
export function defaultAccess(): PermissionAccess {
  return { create: false, view: false, edit: false, delete: false, list: false };
}

/** Safely normalizes any partial access object into a full PermissionAccess */
export function normalizeAccess(
  a?: Partial<PermissionAccess> & { update?: boolean }
): PermissionAccess {
  return {
    create: Boolean(a?.create),
    view:   Boolean(a?.view),
    edit:   Boolean(a?.edit ?? a?.update),
    delete: Boolean(a?.delete),
    list:   Boolean(a?.list),
  };
}

/**
 * normalizeRolePermissionsInput
 *
 * Converts the three historical API shapes for a role's permissions into a flat
 * RolePermissionsMap (Record<key, PermissionAccess & { display_name, title_name }>).
 *
 * display_name and title_name are preserved in every entry so that the sidebar
 * can resolve human-readable labels without the raw PermissionGroup object.
 *
 * Shape 1 — flat object (already-normalised map):
 *   { dashboard: { view: true }, roles: { create: true, view: true } }
 *
 * Shape 2 — legacy array (getCurrentUser embed):
 *   [{ title_name: "Dashboard", display_name: "Dashboard", access: { view: true } }]
 *
 * Shape 3 — populated PermissionGroup object:
 *   { _id: "…", name: "Super Admin", permissions: [ { title_name: …, display_name: … } ] }
 */
export function normalizeRolePermissionsInput(permissions: unknown): RolePermissionsMap {
  if (!permissions) return {};

  function isObj(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }

  function toAccess(val: unknown): PermissionAccess {
    if (!isObj(val)) return defaultAccess();
    return {
      create: Boolean(val.create),
      view:   Boolean(val.view),
      // array shape sends "edit"; flat shape may send "update" — handle both
      edit:   Boolean(val.edit ?? val.update),
      delete: Boolean(val.delete),
      list:   Boolean(val.list),
    };
  }

  /** "Buy/sell" → "buy_sell", "Income & Expense" → "income_expense" */
  function titleToKey(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/&/g, "")
      .replace(/[/\-]/g, " ")
      .replace(/\s+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  // Shape 3: populated PermissionGroup { _id, name, permissions: PermissionItem[] }
  if (isObj(permissions) && Array.isArray((permissions as Record<string, unknown>).permissions)) {
    const items = (permissions as Record<string, unknown>).permissions as unknown[];
    const map: RolePermissionsMap = {};
    for (const p of items) {
      if (!isObj(p)) continue;
      const titleRaw = String(p.title_name ?? "").trim();
      if (!titleRaw) continue;
      const displayName = String(p.display_name ?? "").trim();
      map[titleToKey(titleRaw)] = {
        ...toAccess(p.access),
        title_name:   titleRaw,
        display_name: displayName || titleRaw, // fall back to title_name if display_name missing
      };
    }
    return map;
  }

  // Shape 2: legacy array [{ title_name, display_name, access }]
  if (Array.isArray(permissions)) {
    const map: RolePermissionsMap = {};
    for (const p of permissions) {
      if (!isObj(p)) continue;
      const titleRaw = String(p.title_name ?? "").trim();
      if (!titleRaw) continue;
      const displayName = String(p.display_name ?? "").trim();
      map[titleToKey(titleRaw)] = {
        ...toAccess(p.access),
        title_name:   titleRaw,
        display_name: displayName || titleRaw,
      };
    }
    return map;
  }

  // Shape 1: flat object { key: accessObject }
  // display_name / title_name may already be present — preserve them if so
  if (isObj(permissions)) {
    const map: RolePermissionsMap = {};
    for (const [key, val] of Object.entries(permissions)) {
      if (isObj(val)) {
        map[key] = {
          ...toAccess(val),
          ...(val.display_name ? { display_name: String(val.display_name) } : {}),
          ...(val.title_name   ? { title_name:   String(val.title_name)   } : {}),
        };
      }
    }
    return map;
  }

  return {};
}

// ─── Type guard ───────────────────────────────────────────────────────────────

/**
 * Returns true when `permissions` is a populated PermissionGroup object
 * (has `_id` and `name` at the top level).
 * Use this to distinguish the two union members at runtime.
 */
export function isPermissionGroup(
  permissions: PermissionGroup | RolePermissionsMap | null | undefined
): permissions is PermissionGroup {
  if (!permissions || typeof permissions !== "object") return false;
  return "_id" in permissions && "name" in permissions;
}

// ─── Internal normalizers ─────────────────────────────────────────────────────

function normalizePermissionGroup(raw: PermissionGroup): PermissionGroup {
  return {
    ...raw,
    permissions: (raw.permissions || []).map((item) => ({
      title_name:   item.title_name,
      display_name: item.display_name,
      access:       normalizeAccess(item.access),
    })),
  };
}

function normalizeRole(raw: Role): Role {
  return {
    ...raw,
    permissions: raw.permissions
      ? normalizePermissionGroup(raw.permissions as PermissionGroup)
      : null,
  };
}

// ─── Permission Group API calls ───────────────────────────────────────────────

/** GET /api/permission — fetch all permission groups */
export async function getPermissionGroups(): Promise<PermissionGroup[]> {
  const rows = await api<PermissionGroup[]>("/api/permission");
  return rows.map(normalizePermissionGroup);
}

/** GET /api/permission/:id — fetch one permission group by _id */
export async function getPermissionGroupById(id: string): Promise<PermissionGroup> {
  const row = await api<PermissionGroup>(`/api/permission/${id}`);
  return normalizePermissionGroup(row);
}

// ─── Role API calls ───────────────────────────────────────────────────────────

/** POST /api/role — fetch all roles (with populated permission group) */
export async function getRoles(params?: { search?: string }): Promise<Role[]> {
  const payload = params?.search?.trim() ? { search: params.search.trim() } : {};
  const rows = await api<Role[]>("/api/role", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return rows.map(normalizeRole);
}

/** POST /api/role/add — create a new role */
export async function createRole(body: {
  name: string;
  description?: string;
  /** The Permission group's _id (ObjectId string) */
  permissions?: string;
  status?: "admin" | "user";
  user?: ApiUser;
}) {
  return api<{ message: string; role: Role }>("/api/role/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** PUT /api/role/edit — update an existing role */
export async function updateRole(body: {
  name: string;
  description?: string;
  /** The Permission group's _id (ObjectId string) */
  permissions?: string;
  status?: "admin" | "user";
  user?: ApiUser;
}) {
  return api<{ message: string; role: Role }>("/api/role/edit", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** DELETE /api/role/delete — delete a role by name */
export async function deleteRole(name: string, user?: ApiUser) {
  return api<{ message: string }>("/api/role/delete", {
    method: "DELETE",
    body: JSON.stringify({ name, user }),
  });
}