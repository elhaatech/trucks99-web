const express = require('express');
const Load = require('../schema/load');
const Truck = require('../schema/truck');
const { checkDashboardAccess, isAdminUser } = require('../helpers/dashboardAccess');
const dashboardService = require('../services/dashboardService');
const marketplaceDashboardService = require('../services/marketplaceDashboardService');

const dashboardRouter = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getScope(req) {
  return req.dashboardScope || { isAdmin: true, userId: req.user?._id };
}

function handleError(res, error, label) {
  console.error(`[Dashboard] ${label}:`, error);
  return res.status(500).json({
    message: `Error fetching ${label}`,
    error: error.message,
  });
}

/**
 * GET /api/dashboard/stats
 * Legacy endpoint — kept for backward compatibility.
 */
dashboardRouter.get('/stats', async (req, res) => {
  try {
    const [loadCounts, truckCounts] = await Promise.all([
      Load.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Truck.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const loadByStatus = { pending: 0, assigned: 0, delivered: 0 };
    loadCounts.forEach(({ _id, count }) => {
      if (_id && loadByStatus[_id] !== undefined) loadByStatus[_id] = count;
    });
    const totalLoads = loadCounts.reduce((sum, { count }) => sum + count, 0);

    const truckByStatus = {
      available: 0,
      'in-transit': 0,
      maintenance: 0,
      unavailable: 0,
    };
    truckCounts.forEach(({ _id, count }) => {
      if (_id && truckByStatus[_id] !== undefined) truckByStatus[_id] = count;
    });
    const totalTrucks = truckCounts.reduce((sum, { count }) => sum + count, 0);
    const availableTrucks = truckByStatus.available || 0;
    const busyTrucks = totalTrucks - availableTrucks;

    res.status(200).json({
      loads: {
        total: totalLoads,
        pending: loadByStatus.pending,
        assigned: loadByStatus.assigned,
        delivered: loadByStatus.delivered,
        byStatus: loadByStatus,
      },
      trucks: {
        total: totalTrucks,
        available: availableTrucks,
        busy: busyTrucks,
        inTransit: truckByStatus['in-transit'] || 0,
        maintenance: truckByStatus.maintenance || 0,
        unavailable: truckByStatus.unavailable || 0,
        byStatus: truckByStatus,
      },
    });
  } catch (error) {
    handleError(res, error, 'dashboard stats');
  }
});

/** POST /api/dashboard/access-check — verify subscription without full dashboard data */
dashboardRouter.post(
  '/access-check',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required', hasAccess: false });
    }
    const access = await checkDashboardAccess(req.user);
    return res.json({
      hasAccess: access.allowed,
      isAdmin: access.isAdmin,
    });
  }),
);

// Legacy logistics dashboard endpoints remain POST-only for compatibility.

const routes = [
  ['overview', dashboardService.getOverview],
  ['weekly-income', dashboardService.getWeeklyIncome],
  ['weekly-bookings', dashboardService.getWeeklyBookings],
  ['transaction-summary', dashboardService.getTransactionSummary],
  ['total-counts', dashboardService.getTotalCounts],
  ['status-counts', dashboardService.getStatusCounts],
  ['weekly-growth', dashboardService.getWeeklyGrowth],
  ['recent-activities', dashboardService.getRecentActivities],
  ['revenue-summary', dashboardService.getRevenueSummary],
  ['top-statistics', dashboardService.getTopStatistics],
  ['revenue-trend', dashboardService.getRevenueTrend],
  ['recent-transactions', dashboardService.getRecentTransactions],
  ['top-items', dashboardService.getTopItems],
  ['top-users', dashboardService.getTopUsers],
  ['alerts', dashboardService.getAlerts],
  ['transaction-stats', dashboardService.getTransactionStats],
  ['recent-users', dashboardService.getRecentUsers],
];

routes.forEach(([path, handler]) => {
  dashboardRouter.post(
    `/${path}`,
    asyncHandler(async (req, res) => {
      try {
        const data = await handler(getScope(req), req.body || {});
        return res.status(200).json(data);
      } catch (error) {
        return handleError(res, error, path);
      }
    }),
  );
});

function requireAdminAnalytics(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

function marketplaceFilters(req) {
  return { ...(req.query || {}), ...(req.body || {}) };
}

const marketplaceRoutes = [
  ['summary', marketplaceDashboardService.getSummary],
  ['product-status', marketplaceDashboardService.getProductStatus],
  ['most-viewed-products', marketplaceDashboardService.getMostViewedProducts],
  ['top-performing-products', marketplaceDashboardService.getTopPerformingProducts],
  ['product-views', marketplaceDashboardService.getProductViews],
  ['categories', marketplaceDashboardService.getCategoryAnalytics],
  ['user-analytics', marketplaceDashboardService.getUserAnalytics],
  ['recent-activity', marketplaceDashboardService.getRecentActivity],
];

marketplaceRoutes.forEach(([path, handler]) => {
  const wrap = asyncHandler(async (req, res) => {
    try {
      const data = await handler(marketplaceFilters(req));
      return res.status(200).json(data);
    } catch (error) {
      return handleError(res, error, path);
    }
  });
  dashboardRouter.get(`/${path}`, requireAdminAnalytics, wrap);
  dashboardRouter.post(`/${path}`, requireAdminAnalytics, wrap);
});

module.exports = dashboardRouter;
