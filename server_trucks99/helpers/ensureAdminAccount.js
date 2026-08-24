"use strict";

const Permission = require("../schema/permission");
const Role = require("../schema/role");
const User = require("../schema/user");
const { hashPassword } = require("./password");

const DEDICATED_ADMIN_EMAIL = "admin@trucks99.com";
const DEDICATED_ADMIN_PASSWORD = "Truck@99#";
const ACCESS_ALL = { create: true, view: true, edit: true, delete: true, list: true };

/**
 * Full Admin Portal matrix. Starts from the seed/default modules and adds
 * extra title_name values the Admin sidebar actually gates on.
 */
const FULL_ADMIN_PERMISSION_MODULES = [
  { title_name: "Dashboard", display_name: "Dashboard" },
  { title_name: "Roles", display_name: "Roles" },
  { title_name: "Users", display_name: "Users" },
  { title_name: "Income & Expense Categories", display_name: "Income & Expense Categories" },
  { title_name: "Advertisement", display_name: "Advertisement" },
  { title_name: "Income & Expense", display_name: "Income & Expense" },
  { title_name: "Specifications", display_name: "Specifications" },
  { title_name: "companyStartCountry", display_name: "Company Start Country" },
  { title_name: "Specifications Values", display_name: "Specifications Values" },
  { title_name: "Categories", display_name: "Categories" },
  { title_name: "Sub-Categories", display_name: "Sub Categories" },
  { title_name: "Buy/sell", display_name: "Buy / Sell" },
  { title_name: "Report", display_name: "Report" },
  { title_name: "Profile", display_name: "Profile" },
  { title_name: "Notifications", display_name: "Notifications" },
  { title_name: "Settings", display_name: "Settings" },
  { title_name: "Subscription", display_name: "Packages" },
  { title_name: "Payment Transactions", display_name: "Transactions" },
  { title_name: "permission", display_name: "Permission" },
  { title_name: "Contact Enquiry", display_name: "Enquiry" },
  { title_name: "Load", display_name: "Loads" },
  { title_name: "Materials", display_name: "Materials" },
  { title_name: "VehicleType", display_name: "Vehicle Type" },
  { title_name: "VehicleBodyType", display_name: "Vehicle Body Type" },
  { title_name: "Truck", display_name: "Trucks" },
  { title_name: "Find Load", display_name: "Find Load" },
  { title_name: "Find Truck", display_name: "Find Truck" },
  { title_name: "match_load", display_name: "Match Load" },
  { title_name: "match_truck", display_name: "Match Truck" },
  { title_name: "CMS", display_name: "CMS" },
];

function mergeFullAccess(existingItems) {
  const byTitle = new Map();
  for (const item of existingItems || []) {
    const title = item && item.title_name != null ? String(item.title_name).trim() : "";
    if (!title) continue;
    byTitle.set(title.toLowerCase(), {
      title_name: item.title_name,
      display_name: item.display_name || item.title_name,
      access: { ...ACCESS_ALL },
    });
  }
  for (const mod of FULL_ADMIN_PERMISSION_MODULES) {
    const key = mod.title_name.toLowerCase();
    const prev = byTitle.get(key);
    byTitle.set(key, {
      title_name: prev?.title_name || mod.title_name,
      display_name: prev?.display_name || mod.display_name,
      access: { ...ACCESS_ALL },
    });
  }
  return [...byTitle.values()];
}

async function resolveSuperAdminRole() {
  const existingSuper = await Role.findOne({
    name: { $regex: /^\s*super[\s_-]*admin\s*$/i },
  });
  if (existingSuper) return existingSuper;

  let group = await Permission.findOne({
    name: { $regex: /^\s*super[\s_-]*admin\s*$/i },
  });
  if (!group) {
    group = await Permission.create({
      name: "Super Admin",
      description: "Full access for Super Admin",
      permissions: mergeFullAccess([]),
    });
  } else {
    group.permissions = mergeFullAccess(group.permissions);
    await group.save();
  }

  return Role.create({
    name: "Super Admin",
    description: "Full access",
    status: "admin",
    permissions: group._id,
  });
}

async function ensureFullAccessOnRole(role) {
  if (!role?.permissions) return role;
  const group = await Permission.findById(role.permissions);
  if (!group) return role;
  group.permissions = mergeFullAccess(group.permissions);
  await group.save();
  if (role.status !== "admin") {
    role.status = "admin";
    await role.save();
  }
  return role;
}

async function ensureDedicatedAdminAccount() {
  const role = await ensureFullAccessOnRole(await resolveSuperAdminRole());
  const permissionIds = role.permissions ? [role.permissions] : [];
  const { salt, hash } = hashPassword(DEDICATED_ADMIN_PASSWORD);

  const existing = await User.findOne({
    email: { $regex: `^${DEDICATED_ADMIN_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  }).select("+hash +salt");

  if (existing) {
    existing.email = DEDICATED_ADMIN_EMAIL;
    existing.roleId = role._id;
    existing.permissions = permissionIds;
    existing.status = "active";
    existing.hash = hash;
    existing.salt = salt;
    if (!existing.name) existing.name = "Admin";
    await existing.save();
    console.log(`✓ Dedicated admin account updated: ${DEDICATED_ADMIN_EMAIL} (role: ${role.name})`);
    return existing;
  }

  const user = new User({
    name: "Admin",
    email: DEDICATED_ADMIN_EMAIL,
    roleId: role._id,
    permissions: permissionIds,
    status: "active",
    hash,
    salt,
  });
  await user.save();
  console.log(`✓ Dedicated admin account created: ${DEDICATED_ADMIN_EMAIL} (role: ${role.name})`);
  return user;
}

module.exports = {
  DEDICATED_ADMIN_EMAIL,
  FULL_ADMIN_PERMISSION_MODULES,
  ensureDedicatedAdminAccount,
};
