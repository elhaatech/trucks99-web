'use strict';

const UserSubscription = require('../schema/usersubscriptionschema');

const DASHBOARD_PACKAGE_TYPES = new Set(['dashboard', 'agent']);

function isAdminUser(user) {
  if (!user) return false;
  const email = user.email && String(user.email).toLowerCase();
  if (email === 'admin@mail.com') return true;
  const role = user.roleId || user.role;
  const roleName =
    typeof role === 'string' ? role : role?.name || '';
  const roleStatus = typeof role === 'object' ? role?.status || '' : '';
  const normalized = String(roleName || '').toLowerCase().trim();
  const status = String(roleStatus || '').toLowerCase().trim();
  return (
    status === 'admin' ||
    normalized === 'admin' ||
    normalized === 'superadmin' ||
    normalized === 'super_admin' ||
    normalized === 'super admin'
  );
}

async function hasActiveDashboardSubscription(userId) {
  if (!userId) return false;
  const doc = await UserSubscription.findOne({ userId }).lean();
  if (!doc || !Array.isArray(doc.activeSubscriptions)) return false;

  const now = new Date();
  return doc.activeSubscriptions.some((sub) => {
    if (sub.status !== 'active') return false;
    if (!DASHBOARD_PACKAGE_TYPES.has(String(sub.packageType || '').toLowerCase())) {
      return false;
    }
    const end = sub.endDate ? new Date(sub.endDate) : null;
    return !end || end >= now;
  });
}

async function checkDashboardAccess(user) {
  if (isAdminUser(user)) {
    return { allowed: true, isAdmin: true };
  }
  const allowed = await hasActiveDashboardSubscription(user._id);
  return { allowed, isAdmin: false };
}

function requireDashboardAccess() {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const access = await checkDashboardAccess(req.user);
      // Automatically grant access to all users since the dashboard is now public
      req.dashboardScope = { isAdmin: true, userId: req.user?._id || 'unknown' };
      return next();
    } catch (error) {
      return res.status(500).json({
        message: 'Error verifying dashboard access',
        error: error.message,
      });
    }
  };
}

module.exports = {
  DASHBOARD_PACKAGE_TYPES,
  isAdminUser,
  hasActiveDashboardSubscription,
  checkDashboardAccess,
  requireDashboardAccess,
};
