const express = require('express');
const mongoose = require('mongoose');
const Favorite = require('../schema/favorite');
const User = require('../schema/user');
const Log = require('../schema/log');
const { resolveToObjectId, toResponse } = require('../helpers/uuidHelper');
const { isAdminUser } = require('../helpers/dashboardAccess');

const favoriteRouter = express.Router();

/**
 * ENTITY CONFIG (COMMON)
 */
const ENTITY_CONFIG = {
  buySell: {
    getModel: () => require('../schema/buysellProduct'),
  },

  // add more entities here
};


// ============================================
// ✅ POST → ADD FAVORITE
// ============================================
favoriteRouter.post('/add', async (req, res) => {
  try {
    const { entity, entity_id } = req.body;
    const actor = req.user || {};

    if (!entity) {
      return res.status(400).json({ message: 'entity is required' });
    }

    if (!entity_id) {
      return res.status(400).json({ message: 'entity_id is required' });
    }

    const config = ENTITY_CONFIG[entity];
    if (!config) {
      return res.status(400).json({
        message: `Unsupported entity. Supported: ${Object.keys(ENTITY_CONFIG).join(', ')}`,
      });
    }

    const Model = config.getModel();
    const resolvedId = await resolveToObjectId(Model, entity_id);

    if (!resolvedId) {
      return res.status(404).json({ message: `${entity} not found` });
    }

    // check already exists
    let favorite = await Favorite.findOne({
      userId: actor._id,
      entity,
      entityId: resolvedId,
    });

    if (favorite) {
      favorite.is_favorite = true;
      await favorite.save();

      return res.status(200).json({
        message: 'Favorite updated successfully',
        favorite: toResponse(favorite),
      });
    }

    favorite = await Favorite.create({
      userId: actor._id,
      entity,
      entityId: resolvedId,
      is_favorite: true,
    });

    await new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `added favorite ${entity}`,
    }).save();

    res.status(201).json({
      message: 'Added to favorites successfully',
      favorite: toResponse(favorite),
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error adding favorite',
      error: error.message,
    });
  }
});


function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function favoritedByFromUser(user) {
  if (!user) return null;
  const doc = typeof user.toObject === 'function' ? user.toObject() : user;
  return {
    _id: doc._id,
    id: doc.id,
    name: doc.name || '',
    email: doc.email || '',
    mobile: doc.mobile || '',
  };
}

// ============================================
// ✅ POST → LIST FAVORITES (FILTER BY ENTITY)
// Super admin / role.status=admin → all users' favorites
// Other users → only their own
// Body: { entity, page, limit, search }
// ============================================
favoriteRouter.post('/list', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const entity = String(body.entity || 'buySell').trim() || 'buySell';
    const search = String(body.search || '').trim();
    const hasPaging = body.page != null || body.limit != null;
    const page = Math.max(1, parseInt(body.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(body.limit, 10) || 20));
    const actor = req.user || {};
    const admin = isAdminUser(actor);

    const config = ENTITY_CONFIG[entity];
    if (!config) {
      return res.status(400).json({
        message: `Unsupported entity. Supported: ${Object.keys(ENTITY_CONFIG).join(', ')}`,
      });
    }

    const Model = config.getModel();
    const favFilter = { entity, is_favorite: true };

    if (!admin) {
      if (!actor._id) {
        return res.status(401).json({
          message: 'Token missing or expired. Please log in again.',
        });
      }
      favFilter.userId = actor._id;
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      const [users, products] = await Promise.all([
        User.find({
          $or: [{ name: rx }, { email: rx }, { mobile: rx }],
        })
          .select('_id')
          .lean(),
        Model.find({
          $or: [
            { description: rx },
            { bsNumber: rx },
            { vehicleId: rx },
          ],
        })
          .select('_id')
          .lean(),
      ]);
      favFilter.$or = [
        { userId: { $in: users.map((u) => u._id) } },
        { entityId: { $in: products.map((p) => p._id) } },
      ];
    }

    let favQuery = Favorite.find(favFilter).sort({ createdAt: -1 });
    if (hasPaging) {
      favQuery = favQuery.skip((page - 1) * limit).limit(limit);
    }
    if (admin) {
      favQuery = favQuery.populate('userId', 'id name email mobile');
    }

    const [favorites, total] = await Promise.all([
      favQuery.lean(),
      Favorite.countDocuments(favFilter),
    ]);

    const ids = favorites.map((f) => f.entityId).filter(Boolean);
    const listSelect =
      entity === 'buySell'
        ? 'id bsNumber vehicleId category_id subcategory_id userid price description images specifications country_id state_id city_id address pincode user_type status viewCount created_by createdAt updatedAt'
        : undefined;

    let query = Model.find({ _id: { $in: ids } });
    if (listSelect) query = query.select(listSelect);
    if (entity === 'buySell') {
      query = query
        .populate('category_id', 'category_name')
        .populate('subcategory_id', 'sub_category_name');
    }
    const items = await query.lean();
    const itemMap = new Map(items.map((item) => [String(item._id), item]));

    const result = favorites
      .map((fav) => {
        const item = itemMap.get(String(fav.entityId));
        if (!item) return null;
        const row = {
          ...toResponse(item),
          is_favorite: true,
          favoriteId: fav.id || String(fav._id),
          favoritedAt: fav.createdAt,
        };
        if (admin) {
          row.favoritedBy = favoritedByFromUser(fav.userId);
        }
        return row;
      })
      .filter(Boolean);

    const payload = {
      message: `${entity} favorite list fetched successfully`,
      count: hasPaging ? total : result.length,
      data: result,
      scope: admin ? 'all' : 'self',
    };
    if (hasPaging) {
      payload.pagination = {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit) || 1),
      };
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      message: 'Error fetching favorites',
      error: error.message,
    });
  }
});


// ============================================
// ✅ DELETE → REMOVE FAVORITE
favoriteRouter.delete('/remove', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { entity, entity_id, favoriteId } = body;
    const actor = req.user || {};
    const admin = isAdminUser(actor);

    let deletedFavorite = null;

    if (favoriteId && admin) {
      const raw = String(favoriteId).trim();
      deletedFavorite = await Favorite.findOneAndDelete({ id: raw });
      if (!deletedFavorite && mongoose.Types.ObjectId.isValid(raw)) {
        deletedFavorite = await Favorite.findByIdAndDelete(raw);
      }
    } else {
      if (!entity || !entity_id) {
        return res.status(400).json({ message: 'entity and entity_id are required' });
      }

      const config = ENTITY_CONFIG[entity];
      if (!config) {
        return res.status(400).json({ message: 'Invalid entity' });
      }

      const Model = config.getModel();
      const resolvedId = await resolveToObjectId(Model, entity_id);

      if (!resolvedId) {
        return res.status(404).json({ message: `${entity} not found` });
      }

      const deleteFilter = { entity, entityId: resolvedId };
      if (!admin) {
        deleteFilter.userId = actor._id;
      }
      deletedFavorite = await Favorite.findOneAndDelete(deleteFilter);
    }

    if (!deletedFavorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    await new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `deleted favorite ${deletedFavorite.entity}`,
    }).save();

    res.status(200).json({
      message: 'Favorite deleted permanently',
      favorite: toResponse(deletedFavorite),
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error deleting favorite',
      error: error.message,
    });
  }
});

module.exports = favoriteRouter;