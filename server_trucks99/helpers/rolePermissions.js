/**
 * Role permissions response transformation.
 * Converts role data with permissions array into a flat permissions object keyed by title_name.
 * Reusable across API responses and application code.
 */

/**
 * Convert title_name to a stable object key:
 * - Lowercase
 * - Replace spaces and special characters with underscore
 * @example "Buy/Shell" → "buy_shell", "Truck" → "truck"
 * @param {string} titleName
 * @returns {string}
 */
function titleNameToKey(titleName) {
  if (titleName == null || typeof titleName !== "string") return "";
  const trimmed = titleName.trim();
  if (!trimmed) return "";
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Normalize a single permission's access to { create, update, delete, view }.
 * Maps "edit" → "update"; keeps create, view, delete as-is.
 * @param {object} access - { create?, view?, edit?, delete? }
 * @returns {{ create: boolean, update: boolean, delete: boolean, view: boolean }}
 */
function normalizePermissionAccess(access) {
  if (access == null || typeof access !== "object") {
    return { create: false, update: false, delete: false, view: false };
  }
  return {
    create: Boolean(access.create),
    view: Boolean(access.view),
    update: Boolean(access.edit ?? access.update),
    delete: Boolean(access.delete),
    list: Boolean(access.list),
  };
}

/**
 * Transform permissions array into an object keyed by normalized title_name.
 * Each value is { display_name, create, update, delete, view }.   ← NEW: display_name added
 * @param {Array<{ title_name: string, display_name?: string, access: object }>} permissionsArray
 * @returns {Record<string, { display_name: string|null, create: boolean, update: boolean, delete: boolean, view: boolean }>}
 */
function permissionsArrayToObject(permissionsArray) {
  const result = {};
  if (!Array.isArray(permissionsArray)) return result;

  for (const p of permissionsArray) {
    const doc = p && (p.toObject ? p.toObject() : p);
    if (!doc || doc.title_name == null) continue;

    const key = titleNameToKey(doc.title_name);
    if (!key) continue;

    result[key] = {
      title_name: doc.title_name, // ← NEW
      display_name: doc.display_name ?? null, // ← NEW
      ...normalizePermissionAccess(doc.access),
    };
  }
  return result;
}

/**
 * Transform role data for API response: permissions array → object, with rolename.
 * Input: role document (or plain object) with .name and .permissions (array).
 * Output: { rolename, permissions } for use in responses.
 *
 * @param {object} roleData - Role doc or plain object: { name, permissions?: Array }
 * @returns {{ rolename: string, permissions: Record<string, { display_name: string|null, create: boolean, update: boolean, delete: boolean, view: boolean }> }}
 */
function transformRolePermissions(roleData) {
  const role = roleData && (roleData.toObject ? roleData.toObject() : roleData);
  const name = role && typeof role.name === "string" ? role.name.trim() : "";
  const permissions = permissionsArrayToObject(role?.permissions ?? []);
  return {
    rolename: name,
    permissions,
  };
}

module.exports = {
  titleNameToKey,
  normalizePermissionAccess,
  permissionsArrayToObject,
  transformRolePermissions,
};
