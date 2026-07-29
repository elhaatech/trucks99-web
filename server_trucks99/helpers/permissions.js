/**
 * Extract permission identifiers from permissions array (populated refs or strings).
 * Supports Permission docs with title_name (or legacy name).
 * @param {Array} arr - Array of Permission docs { title_name } or { name } or strings
 * @returns {string[]}
 */
function getPermissionNames(arr) {
  if (!Array.isArray(arr)) return [];
  const names = [];
  for (const p of arr) {
    if (typeof p === 'string' && p.trim()) names.push(p.trim());
    else if (p && typeof p === 'object') {
      const id = (p.title_name != null && String(p.title_name).trim()) || (p.name != null && String(p.name).trim());
      if (id) names.push(id);
    }
  }
  return names;
}

/**
 * Build nested "modules" object for API response from user permissions.
 * Admin (role 'Admin' or email admin@mail.com) always gets full access.
 * Supports doc.permissions and doc.roleId.permissions as populated refs (use .name) or string arrays.
 */
function buildModulesResponse(user) {
  const doc = user && (user.toObject ? user.toObject() : user);
  if (!doc) return getEmptyModules();

  const roleName = doc.roleId && doc.roleId.name ? doc.roleId.name : (typeof doc.role === 'string' ? doc.role : '');
  const isAdmin = roleName === 'Admin' || roleName === 'SUPER_ADMIN' || (doc.email && String(doc.email).toLowerCase() === 'admin@mail.com');
  if (isAdmin) return getFullModules();

  if (doc.permissionsMap && typeof doc.permissionsMap === 'object' && !Array.isArray(doc.permissionsMap)) {
    return doc.permissionsMap;
  }

  const userNames = getPermissionNames(doc.permissions || []);
  const roleNames = (doc.roleId && Array.isArray(doc.roleId.permissions))
    ? getPermissionNames(doc.roleId.permissions)
    : [];
  const perms = [...new Set([...roleNames, ...userNames])];
  return parseModuleActionPermissions(perms);
}

/** Empty structure for all known modules (matches your requested shape) */
function getEmptyModules() {
  return {
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
  };
}

/** Full access: all modules, all actions true (for Admin / SUPER_ADMIN / admin@mail.com) */
function getFullModules() {
  return {
    dashboard: { access: true },
    load_management: { create: true, view: true, edit: true, delete: true, accept: true },
    truck_management: { create: true, view: true, edit: true },
    driver_management: { create: true, view: true },
    shipment_management: { view: true, update: true },
    payments: { view: true },
    documents: { upload: true },
    profile: { edit: true },
    user_management: { create: true, edit: true, delete: true, view: true },
    reports: { view: true },
    users: { create: true, edit: true, delete: true, view: true, read: true, write: true },
    roles: { view: true, delete: true, create: true, edit: true, read: true, write: true },
    permissions: { read: true, write: true },
    logs: { read: true, write: true, view: true },
  };
}

/**
 * Parse permissions like "dashboard:access", "load_management:accept", "shipment_management:update",
 * "documents:upload", "profile:edit" into nested modules object.
 */
function parseModuleActionPermissions(perms) {
  const modules = getEmptyModules();
  const has = (p) => perms.includes(p);

  for (const p of perms) {
    if (typeof p !== 'string') continue;
    const [module, action] = p.split(':').map((s) => s && s.trim());
    if (module && action) {
      if (!modules[module]) modules[module] = {};
      modules[module][action] = true;
    }
  }

  const hasModuleAction = perms.some((p) => typeof p === 'string' && p.includes(':'));
  if (!hasModuleAction && perms.length > 0) {
    const hasRead = has('read');
    const hasWrite = has('write');
    const hasDelete = has('delete');
    modules.dashboard.access = hasRead || hasWrite || hasDelete;
    if (modules.load_management) {
      modules.load_management.view = hasRead;
      modules.load_management.create = hasWrite;
      modules.load_management.edit = hasWrite;
      modules.load_management.delete = hasDelete;
    }
    if (modules.truck_management) modules.truck_management.view = hasRead;
    if (modules.reports) modules.reports.view = hasRead;
    if (modules.users) {
      modules.users.view = hasRead;
      modules.users.create = hasWrite;
      modules.users.edit = hasWrite;
      modules.users.delete = hasDelete;
    }
    if (modules.roles) {
      modules.roles.view = hasRead;
      modules.roles.create = hasWrite;
      modules.roles.edit = hasWrite;
      modules.roles.delete = hasDelete;
    }
  }

  return modules;
}

/**
 * Return only modules/actions that are true (strip all false).
 * Used so API response contains only the true data.
 * @param {Object} fullModules - Full modules object (e.g. from parseModuleActionPermissions)
 * @returns {Object} Nested object with only true values, e.g. { dashboard: { access: true }, reports: { view: true } }
 */
function getModulesOnlyTrue(fullModules) {
  if (!fullModules || typeof fullModules !== 'object') return {};
  const out = {};
  for (const [moduleKey, actions] of Object.entries(fullModules)) {
    if (!actions || typeof actions !== 'object') continue;
    const trueActions = {};
    for (const [action, value] of Object.entries(actions)) {
      if (value === true) trueActions[action] = true;
    }
    if (Object.keys(trueActions).length > 0) out[moduleKey] = trueActions;
  }
  return out;
}

/**
 * Build permission names (e.g. ["dashboard:access", "reports:view"]) from a modules payload
 * that has only true values (or mixed true/false).
 * @param {Object} modulesObj - e.g. { dashboard: { access: true }, load_management: { view: true } }
 * @returns {string[]}
 */
function getPermissionNamesFromModulesObject(modulesObj) {
  if (!modulesObj || typeof modulesObj !== 'object') return [];
  const names = [];
  for (const [moduleKey, actions] of Object.entries(modulesObj)) {
    if (!actions || typeof actions !== 'object') continue;
    for (const [action, value] of Object.entries(actions)) {
      if (value === true) names.push(`${moduleKey}:${action}`);
    }
  }
  return names;
}

/** For backward compat: same as buildModulesResponse but key name is buildPermissionsResponse */
function buildPermissionsResponse(user) {
  return buildModulesResponse(user);
}

/**
 * Normalize permissions array: remove duplicates, trim strings, remove empty. Use for string-only lists.
 * @param {any} permissions - Array of permission strings (or undefined/null)
 * @returns {string[]} Unique, non-empty permission names
 */
function normalizePermissionsArray(permissions) {
  if (!Array.isArray(permissions)) return [];
  const seen = new Set();
  const out = [];
  for (const p of permissions) {
    const s = typeof p === 'string' ? p.trim() : '';
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

const ObjectId = require('mongoose').Types.ObjectId;

/**
 * Resolve permissions payload (names or ObjectIds) to array of Permission ObjectIds.
 * Accepts array of permission names (strings) or ObjectIds; looks up by name, validates ids.
 * @param {Model} Permission - Mongoose Permission model
 * @param {any} permissions - Array of permission names (strings) or ObjectIds, or undefined
 * @returns {Promise<ObjectId[]>} Unique, valid Permission _ids
 */
async function resolvePermissionsToIds(Permission, permissions) {
  if (!Permission || !Array.isArray(permissions) || permissions.length === 0) return [];
  const ids = new Set();
  for (const p of permissions) {
    if (!p) continue;
    if (ObjectId.isValid(p) && String(p).length === 24) {
      const found = await Permission.findById(p).select('_id').lean();
      if (found) ids.add(found._id);
      continue;
    }
    const title = typeof p === 'string' ? p.trim() : '';
    if (!title) continue;
    // Permission docs are groups keyed by top-level `name` (nested items use title_name)
    let doc = await Permission.findOne({ name: title }).select('_id').lean();
    if (!doc) {
      doc = await Permission.findOne({ 'permissions.title_name': title }).select('_id').lean();
    }
    if (doc) ids.add(doc._id);
  }
  return [...ids];
}

module.exports = {
  buildModulesResponse,
  buildPermissionsResponse,
  getEmptyModules,
  getFullModules,
  getPermissionNames,
  getModulesOnlyTrue,
  getPermissionNamesFromModulesObject,
  parseModuleActionPermissions,
  normalizePermissionsArray,
  resolvePermissionsToIds,
};
