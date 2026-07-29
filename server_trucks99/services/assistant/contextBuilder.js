'use strict';

const BuySellProduct = require('../../schema/buysellProduct');
const Category = require('../../schema/categorymodel');
const SubCategory = require('../../schema/subcategorymodel');
const BuySellFeaturedVehicle = require('../../schema/buySellFeaturedVehicle');

/**
 * Build a compact AI context snapshot for the logged-in user.
 * Uses the same Mongo collections as existing marketplace APIs.
 */
async function buildUserAssistantContext(user) {
  const userId = user?._id;
  if (!userId) {
    return { user: null, listings: {}, categories: [] };
  }

  const [
    categories,
    statusGroups,
    featuredCount,
    recentListings,
  ] = await Promise.all([
    Category.find({ status: { $regex: /^active$/i } })
      .select('id uuid category_name status')
      .lean()
      .limit(50),
    BuySellProduct.aggregate([
      { $match: { userid: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    BuySellFeaturedVehicle.countDocuments({
      userId,
      status: 'active',
    }).catch(() => 0),
    BuySellProduct.find({ userid: userId })
      .select('id bsNumber price status category_id subcategory_id description createdAt listing_highlights')
      .populate('category_id', 'category_name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const counts = {
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
    sold: 0,
    draft: 0,
    inactive: 0,
    booking: 0,
    purchased: 0,
  };
  for (const row of statusGroups) {
    const key = String(row._id || '').toLowerCase();
    if (key in counts) counts[key] = row.count;
    counts.total += row.count;
  }

  const roleName =
    (user.roleId && user.roleId.name) ||
    (typeof user.role === 'string' ? user.role : '') ||
    '';

  return {
    user: {
      id: String(user.id || user._id),
      name: user.name || '',
      mobile: user.mobile || '',
      role: roleName,
    },
    listings: {
      counts,
      featuredActive: featuredCount,
      recent: recentListings.map((p) => ({
        id: p.id || String(p._id),
        bsNumber: p.bsNumber,
        price: p.price,
        status: p.status,
        category:
          p.category_id && typeof p.category_id === 'object'
            ? p.category_id.category_name
            : null,
        createdAt: p.createdAt,
      })),
    },
    categories: categories.map((c) => ({
      id: String(c._id),
      uuid: c.id || c.uuid,
      name: c.category_name,
    })),
  };
}

async function loadSubCategoriesForCategory(categoryUuidOrId) {
  if (!categoryUuidOrId) return [];
  const filter = {
    $or: [
      { category_id: String(categoryUuidOrId) },
      { category_id: String(categoryUuidOrId) },
    ],
    status: { $regex: /^active$/i },
  };
  return SubCategory.find(filter)
    .select('id uuid sub_category_name category_id')
    .lean()
    .limit(100);
}

module.exports = {
  buildUserAssistantContext,
  loadSubCategoriesForCategory,
};
