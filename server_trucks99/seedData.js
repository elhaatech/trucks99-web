require('dotenv').config();
const Permission = require('./schema/permission');
const Role = require('./schema/role');
const User = require('./schema/user');
const { seedLocationData } = require('./location/seedLocationData');

const ACCESS_ALL = { create: true, view: true, edit: true, delete: true, list: true };
const ACCESS_VIEW = { create: false, view: true, edit: false, delete: false, list: true };

/** Matches the admin create-permission template (no Load / Truck / Transporter / Match). */
const DEFAULT_PERMISSION_MODULES = [
  { title_name: 'Dashboard', display_name: 'Dashboard' },
  { title_name: 'Roles', display_name: 'Roles' },
  { title_name: 'Users', display_name: 'Users' },
  { title_name: 'Income & Expense Categories', display_name: 'Income & Expense Categories' },
  { title_name: 'Advertisement', display_name: 'Advertisement' },
  { title_name: 'Income & Expense', display_name: 'Income & Expense' },
  { title_name: 'Specifications', display_name: 'Specifications' },
  { title_name: 'companyStartCountry', display_name: 'Company Start Country' },
  { title_name: 'Specifications Values', display_name: 'Specifications Values' },
  { title_name: 'Categories', display_name: 'Categories' },
  { title_name: 'Sub-Categories', display_name: 'Sub Categories' },
  { title_name: 'Buy/sell', display_name: 'Buy / Sell' },
  { title_name: 'Report', display_name: 'Report' },
  { title_name: 'Profile', display_name: 'Profile' },
  { title_name: 'Notifications', display_name: 'Notifications' },
  { title_name: 'Settings', display_name: 'Settings' },
  { title_name: 'Subscription', display_name: 'Packages' },
  { title_name: 'Payment Transactions', display_name: 'Transactions' },
  { title_name: 'permission', display_name: 'Permission' },
];

function buildPermissionItems(access) {
  return DEFAULT_PERMISSION_MODULES.map((item) => ({
    title_name: item.title_name,
    display_name: item.display_name,
    access: { ...access },
  }));
}

const dummyRoles = [
  {
    name: 'Admin',
    description: 'Full access',
    status: 'admin',
    permissionItems: buildPermissionItems(ACCESS_ALL),
  },
  {
    name: 'Dev',
    description: 'Developer access',
    permissionItems: buildPermissionItems(ACCESS_ALL),
  },
  {
    name: 'Viewer',
    description: 'Read-only access',
    permissionItems: buildPermissionItems(ACCESS_VIEW),
  },
];

const dummyUsers = [
  { name: 'Admin User', mobile: '+919876543210', role: 'Admin', provider: 'local' },
  { name: 'Dev User', mobile: '+919876543211', role: 'Dev', provider: 'local' },
  { name: 'Viewer User', mobile: '+919876543212', role: 'Viewer', provider: 'local' },
];

/**
 * Ensure a Permission group exists for a role (create by top-level `name` if missing).
 * Returns the Permission document.
 */
async function ensurePermissionGroup(groupName, permissionItems, description) {
  return Permission.findOneAndUpdate(
    { name: groupName },
    {
      $setOnInsert: {
        name: groupName,
        description: description || `Permissions for ${groupName}`,
        permissions: permissionItems || [],
      },
    },
    { upsert: true, new: true }
  );
}

/**
 * Ensure Role exists and points at its Permission group ObjectId.
 */
async function ensureRole(roleDef) {
  const group = await ensurePermissionGroup(
    roleDef.name,
    roleDef.permissionItems || [],
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
 * Does not recreate Buy/Sell, Shipper, Agent, or Transporter roles.
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
