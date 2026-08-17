/**
 * Module–action structure (must match server getEmptyModules / parseModuleActionPermissions).
 * Each key is a module; value is an object of action -> boolean.
 */
export const MODULES_TEMPLATE = {
  dashboard: { access: false },
  load_management: { create: false, view: false, edit: false, delete: false, accept: false },
  truck_management: { create: false, view: false, edit: false },
  driver_management: { create: false, view: false },
  shipment_management: { view: false, update: false },
  payments: { view: false },
  documents: { upload: false },
  profile: { edit: false },
  user_management: { create: false, edit: false, delete: false, view: false },
  reports: { view: false },
  users: { create: false, edit: false, delete: false, view: false, read: false, write: false },
  roles: { view: false, delete: false, create: false, edit: false, read: false, write: false },
  permissions: { read: false, write: false },
  logs: { read: false, write: false, view: false },
} as const;

export type ModulesState = Record<string, Record<string, boolean>>;

/** Convert "module:action" to permission name; parse "reports:view" -> { module: "reports", action: "view" } */
export function parsePermissionName(name: string): { module: string; action: string } | null {
  const [module, action] = name.split(":").map((s) => s?.trim());
  return module && action ? { module, action } : null;
}

/** Build list of permission names from modules state (e.g. ["dashboard:access", "reports:view"]) */
export function getPermissionNamesFromModules(modules: ModulesState): string[] {
  const out: string[] = [];
  for (const [module, actions] of Object.entries(modules)) {
    if (!actions || typeof actions !== "object") continue;
    for (const [action, value] of Object.entries(actions)) {
      if (value) out.push(`${module}:${action}`);
    }
  }
  return out;
}

/** Set modules state from a single permission name (e.g. "reports:view") */
export function modulesFromPermissionName(name: string): ModulesState {
  const parsed = parsePermissionName(name);
  const state: ModulesState = JSON.parse(JSON.stringify(MODULES_TEMPLATE));
  if (parsed && state[parsed.module]) {
    (state[parsed.module] as Record<string, boolean>)[parsed.action] = true;
  }
  return state;
}

/** Return only modules/actions that are true (for API payload and display). Response-style: only true data. */
export function getModulesOnlyTrue(modules: ModulesState): Record<string, Record<string, true>> {
  const out: Record<string, Record<string, true>> = {};
  for (const [moduleKey, actions] of Object.entries(modules)) {
    if (!actions || typeof actions !== "object") continue;
    const trueActions: Record<string, true> = {};
    for (const [action, value] of Object.entries(actions)) {
      if (value === true) trueActions[action] = true;
    }
    if (Object.keys(trueActions).length > 0) out[moduleKey] = trueActions;
  }
  return out;
}

/** Merge sparse modules (only-true from API) into full template. For use in selectors. */
export function mergeModulesWithTemplate(sparse: Record<string, Record<string, boolean>> | undefined): ModulesState {
  const state: ModulesState = JSON.parse(JSON.stringify(MODULES_TEMPLATE));
  if (!sparse || typeof sparse !== "object") return state;
  for (const [moduleKey, actions] of Object.entries(sparse)) {
    if (!state[moduleKey] || !actions) continue;
    for (const [action, value] of Object.entries(actions)) {
      if (value && state[moduleKey]) (state[moduleKey] as Record<string, boolean>)[action] = true;
    }
  }
  return state;
}

/** Human-readable labels for modules */
export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  load_management: "Load Management",
  truck_management: "Truck Management",
  driver_management: "Driver Management",
  shipment_management: "Shipment Management",
  payments: "Payments",
  documents: "Documents",
  profile: "Profile",
  user_management: "User Management",
  reports: "Reports",
  users: "Users",
  roles: "Roles",
  permissions: "Permissions",
  logs: "Logs",
};
