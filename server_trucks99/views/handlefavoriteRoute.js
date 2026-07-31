const express = require('express');
const Favorite = require('../schema/favorite');
const Log = require('../schema/log');
const { resolveToObjectId, toResponse } = require('../helpers/uuidHelper');

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


// ============================================
// ✅ POST → LIST FAVORITES (FILTER BY ENTITY)
// ============================================
favoriteRouter.post('/list', async (req, res) => {
  try {
    const { entity } = req.body;
    const actor = req.user || {};

    if (!entity) {
      return res.status(400).json({ message: 'entity is required' });
    }

    const config = ENTITY_CONFIG[entity];
    if (!config) {
      return res.status(400).json({
        message: `Unsupported entity. Supported: ${Object.keys(ENTITY_CONFIG).join(', ')}`,
      });
    }

    const Model = config.getModel();

    // get favorites
    const favorites = await Favorite.find({
      userId: actor._id,
      entity,
      is_favorite: true,
    })
      .select("entityId")
      .lean();

    const ids = favorites.map(f => f.entityId);

    // get actual data (list projection for buySell)
    const listSelect =
      entity === "buySell"
        ? "id bsNumber category_id subcategory_id userid price description images specifications country_id state_id city_id address pincode user_type status viewCount created_by createdAt updatedAt"
        : undefined;

    let query = Model.find({ _id: { $in: ids } });
    if (listSelect) query = query.select(listSelect);
    if (entity === "buySell") {
      query = query
        .populate("category_id", "category_name")
        .populate("subcategory_id", "sub_category_name");
    }
    const items = await query.lean();

    // map result
    const result = items.map(item => ({
      ...toResponse(item),
      is_favorite: true,
    }));

    res.status(200).json({
      message: `${entity} favorite list fetched successfully`,
      count: result.length,
      data: result,
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error fetching favorites',
      error: error.message,
    });
  }
});


// ============================================
// ✅ DELETE → REMOVE FAVORITE
favoriteRouter.delete('/remove', async (req, res) => {
  try {
    const { entity, entity_id } = req.body;
    const actor = req.user || {};

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

    // ✅ HARD DELETE
    const deletedFavorite = await Favorite.findOneAndDelete({
      userId: actor._id,
      entity,
      entityId: resolvedId,
    });

    if (!deletedFavorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    await new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `deleted favorite ${entity}`,
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