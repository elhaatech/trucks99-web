// helpers/formatUser.js

/**
 * Strips false values and the unused `list` key from an access object.
 * e.g. { create: true, view: true, edit: false, delete: false, list: false }
 *   -> { create: true, view: true }
 */
function formatAccess(access = {}) {
  const out = {};
  if (access.create) out.create = true;
  if (access.view) out.view = true;
  if (access.edit) out.edit = true;
  if (access.delete) out.delete = true;
  if (access.list) out.list = true; // include if truthy, otherwise omit
  // `list` is intentionally omitted
  return out;
}

/**
 * Formats a populated roleId document into a clean role object.
 * roleId.permissions is a populated Permission doc whose
 * `.permissions` array holds the actual per-module entries.
 */
function formatRole(roleId) {
  if (!roleId || typeof roleId !== "object") return null;

  // When populated: roleId.permissions is the Permission document
  // The actual array lives at roleId.permissions.permissions
  const permsArray = Array.isArray(roleId.permissions?.permissions)
    ? roleId.permissions.permissions
    : Array.isArray(roleId.permissions)
      ? roleId.permissions // fallback: already a plain array
      : [];

  return {
    _id: roleId._id,
    id: roleId.id || roleId.uuid || undefined,
    name: roleId.name,
    description: roleId.description || null,
    status: roleId.status || null,
    permissions: permsArray.map((p) => ({
      title_name: p.title_name,
      display_name: p.display_name,
      access: formatAccess(p.access),
    })),
    createdAt: roleId.createdAt,
    updatedAt: roleId.updatedAt,
  };
}

/**
 * Formats a raw Mongoose user document (plain object after .lean() or .toObject())
 * into the standardised API response shape.
 */
function formatUser(u) {
  if (!u) return null;
  return {
    _id: u._id,
    id: u.id || u.uuid || undefined,
    name: u.name || null,
    company_name: u.company_name || null,
    profileImage: u.profileImage || null,
    email: u.email || null,
    mobile: u.mobile || null,
    city: u.city || null,
    state: u.state || null,
    country: u.country || null,
    status: u.status || null,
    termsAccepted: !!u.termsAccepted, // ✅ FIX: now included in every response
    role: formatRole(u.roleId),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

module.exports = { formatUser, formatRole, formatAccess };
