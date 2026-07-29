require('dotenv').config();
const mongoose = require('mongoose');
const Permission = require('./schema/permission');
const Role = require('./schema/role');
const User = require('./schema/user');
const { seedLocationData } = require('./location/seedLocationData');

// Admin, Dev, Viewer – you already have these; not re-seeded here.
// Buy/Sell, Shipper, Agent, Transporter – always ensured below.
const businessRoles = [
  { name: 'Buy/Sell', description: 'Users who buy or sell goods and request transport', permissions: ['dashboard:access', 'load_management:view', 'truck_management:view', 'reports:view'] },
  { name: 'Shipper', description: 'Posts shipment details and manages load requests', permissions: ['dashboard:access', 'load_management:create', 'load_management:edit', 'load_management:delete', 'load_management:view', 'truck_management:view', 'reports:view', 'payments:view'] },
  { name: 'Agent', description: 'Coordinates between shipper and transporter', permissions: ['dashboard:access', 'load_management:create', 'load_management:edit', 'load_management:view', 'truck_management:view', 'user_management:view', 'reports:view', 'payments:view'] },
  { name: 'Transporter', description: 'Truck owner/driver who accepts and delivers loads', permissions: ['dashboard:access', 'load_management:view', 'truck_management:view', 'truck_management:edit', 'reports:view', 'payments:view'] }
];

const businessUsers = [
  { name: 'Buy Sell User', mobile: '+919876543201', role: 'Buy/Sell', provider: 'local' },
  { name: 'Shipper User', mobile: '+919876543202', role: 'Shipper', provider: 'local' },
  { name: 'Agent User', mobile: '+919876543203', role: 'Agent', provider: 'local' },
  { name: 'Transporter User', mobile: '+919876543204', role: 'Transporter', provider: 'local' }
];

// For empty DB: full seed including Admin, Dev, Viewer
const dummyRoles = [
  { name: 'Admin', description: 'Full access', status: 'admin', permissions: ['dashboard:access', 'load_management:create', 'load_management:edit', 'load_management:delete', 'load_management:view', 'truck_management:create', 'truck_management:edit', 'truck_management:delete', 'truck_management:view', 'user_management:create', 'user_management:edit', 'user_management:delete', 'user_management:view', 'reports:view', 'payments:view', 'roles:view', 'roles:create', 'roles:edit', 'roles:delete', 'permissions:view'] },
  { name: 'Dev', description: 'Developer access', permissions: ['dashboard:access', 'load_management:create', 'load_management:edit', 'load_management:view', 'truck_management:create', 'truck_management:edit', 'truck_management:view', 'user_management:view', 'reports:view', 'payments:view', 'roles:view', 'permissions:view'] },
  { name: 'Viewer', description: 'Read-only access', permissions: ['dashboard:access', 'load_management:view', 'truck_management:view', 'reports:view'] },
  ...businessRoles
];

const dummyUsers = [
  { name: 'Admin User', mobile: '+919876543210', role: 'Admin', provider: 'local' },
  { name: 'Dev User', mobile: '+919876543211', role: 'Dev', provider: 'local' },
  { name: 'Viewer User', mobile: '+919876543212', role: 'Viewer', provider: 'local' },
  ...businessUsers
];

/** Infer access flags from permission name (e.g. "load_management:view" -> view: true) */
function accessFromPermissionName(name) {
  const access = { create: false, view: false, edit: false, delete: false, list: false };
  if (!name || typeof name !== 'string') return access;
  const lower = name.toLowerCase();
  const part = name.includes(':') ? name.split(':')[1] : name;
  const action = (part || '').toLowerCase();
  if (action === 'view' || action === 'read' || action === 'access') access.view = true;
  else if (action === 'create') access.create = true;
  else if (action === 'edit' || action === 'update' || action === 'write') access.edit = true;
  else if (action === 'delete') access.delete = true;
  else if (action === 'list') access.list = true;
  else {
    if (lower.includes('view') || lower.includes('read') || lower.includes('access')) access.view = true;
    if (lower.includes('create')) access.create = true;
    if (lower.includes('edit') || lower.includes('update') || lower.includes('write')) access.edit = true;
    if (lower.includes('delete')) access.delete = true;
    if (lower.includes('list')) access.list = true;
    if (!access.view && !access.create && !access.edit && !access.delete && !access.list) access.view = true;
  }
  return access;
}

/**
 * Build nested permission items for a Permission group document.
 * Schema: Permission { name, description, permissions: [{ title_name, display_name, access }] }
 */
function buildPermissionItems(names) {
  return (names || []).map((name) => ({
    title_name: name,
    display_name: name,
    access: accessFromPermissionName(name),
  }));
}

/**
 * Ensure a Permission group exists for a role (create by top-level `name` if missing).
 * Returns the Permission document.
 */
async function ensurePermissionGroup(groupName, permissionNames, description) {
  const items = buildPermissionItems(permissionNames);
  const doc = await Permission.findOneAndUpdate(
    { name: groupName },
    {
      $setOnInsert: {
        name: groupName,
        description: description || `Permissions for ${groupName}`,
        permissions: items,
      },
    },
    { upsert: true, new: true }
  );
  return doc;
}

/**
 * Ensure Role exists and points at its Permission group ObjectId.
 */
async function ensureRole(roleDef) {
  const group = await ensurePermissionGroup(
    roleDef.name,
    roleDef.permissions || [],
    roleDef.description
  );
  const status = roleDef.status || (roleDef.name === 'Admin' ? 'admin' : 'user');
  return Role.findOneAndUpdate(
    { name: roleDef.name },
    {
      $setOnInsert: {
        name: roleDef.name,
        description: roleDef.description || '',
        status,
        permissions: group._id,
      },
    },
    { upsert: true, new: true }
  );
}

/**
 * Seed database with dummy data if collections are empty.
 * Permission = group doc { name, permissions: [{ title_name, access }] }.
 * Role.permissions = ObjectId ref to one Permission group.
 * User.permissions = Permission group ObjectId refs (usually the role's group).
 */
async function seedDatabase() {
  try {
    console.log('🌱 Checking database for seed data...');

    // Drop legacy unique index on users.email if it exists (email is not required/unique)
    try {
      await User.collection.dropIndex('email_1');
      console.log('✓ Dropped legacy users email_1 index.');
    } catch (e) {
      if (e.code !== 27 && e.codeName !== 'IndexNotFound') console.warn('Note (users email index):', e.message);
    }

    // Seed Roles (+ their Permission groups) when empty
    const roleCount = await Role.countDocuments();
    if (roleCount === 0) {
      console.log('👥 No roles found. Creating dummy roles...');
      for (const r of dummyRoles) {
        await ensureRole(r);
      }
      console.log('✅ Roles created successfully!');
    } else {
      console.log(`✓ Found ${roleCount} existing roles.`);
    }

    // Seed Users with roleId and Permission group ObjectIds (mobile-only, OTP login)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('👤 No users found. Creating dummy users...');
      for (const userData of dummyUsers) {
        try {
          const { role, ...rest } = userData;
          const roleDoc = role ? await Role.findOne({ name: role }) : null;
          const roleId = roleDoc ? roleDoc._id : undefined;
          const permissionIds = roleDoc && roleDoc.permissions ? [roleDoc.permissions] : [];
          const user = new User({
            ...rest,
            roleId,
            permissions: permissionIds,
            provider: userData.provider || 'local',
          });
          await user.save();
          console.log(`✓ User created: ${userData.name} (${userData.mobile})`);
        } catch (error) {
          console.error(`✗ Error creating user ${userData.name}:`, error.message);
        }
      }
      console.log('✅ Users created successfully!');
    } else {
      console.log(`✓ Found ${userCount} existing users.`);
    }

    // Always ensure business roles and users exist
    for (const r of businessRoles) {
      await ensureRole(r);
    }
    for (const userData of businessUsers) {
      const existing = await User.findOne({ mobile: userData.mobile });
      if (!existing) {
        try {
          const { role, ...rest } = userData;
          const roleDoc = role ? await Role.findOne({ name: role }) : null;
          const roleId = roleDoc ? roleDoc._id : undefined;
          const permissionIds = roleDoc && roleDoc.permissions ? [roleDoc.permissions] : [];
          const user = new User({
            ...rest,
            roleId,
            permissions: permissionIds,
            provider: userData.provider || 'local',
          });
          await user.save();
          console.log(`✓ Business user created: ${userData.name} (${userData.mobile})`);
        } catch (err) {
          console.error(`✗ Error creating ${userData.name}:`, err.message);
        }
      }
    }

    // Seed static location hierarchy (Country -> State -> City) if empty.
    // Note: `cities` is a large dataset; the very first run can take a while.
    try {
      const locationResult = await seedLocationData({ force: false });
      console.log('📍 Location seeding result:', locationResult?.seeded ? locationResult : locationResult?.reason);
    } catch (e) {
      console.error('❌ Location seeding failed:', e?.message || String(e));
    }

    console.log('🎉 Database seeding completed!\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

module.exports = seedDatabase;
