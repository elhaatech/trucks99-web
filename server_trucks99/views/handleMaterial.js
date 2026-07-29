const express = require('express');
const Material = require('../schema/material');
const Log = require('../schema/log');
const { findByIdOrUuid, resolveToObjectId, resolveIdsToObjectIds, toResponse, toResponseList } = require('../helpers/uuidHelper');

const materialRouter = express.Router();
const entityName = 'material';

// GET /api/material/all
materialRouter.get('/all', async (req, res) => {
  try {
    const list = await Material.find().sort({ materials_type: 1 }).lean();
    res.status(200).json(toResponseList(list));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}s`, error: error.message });
  }
});

// GET /api/material/:id (id can be uuid or _id)
materialRouter.get('/:id', async (req, res) => {
  try {
    const item = await findByIdOrUuid(Material, req.params.id);
    if (!item) return res.status(404).json({ message: `${entityName} not found` });
    res.status(200).json(toResponse(item));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}`, error: error.message });
  }
});

// POST /api/material/add
materialRouter.post('/add', async (req, res) => {
  try {
    const { materials_type, subcommodity, commodity, is_insurance_available, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!materials_type || !String(materials_type).trim()) {
      return res.status(400).json({ message: 'materials_type is required' });
    }

    const item = await Material.create({
      materials_type: String(materials_type).trim(),
      subcommodity: subcommodity ? String(subcommodity).trim() : '',
      commodity: commodity ? String(commodity).trim() : '',
      is_insurance_available: Boolean(is_insurance_available),
    });

    const newLog = new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `added new ${entityName}: ${item.materials_type} (${item._id})`,
    });
    await newLog.save();

    res.status(201).json({ message: `${entityName} created successfully`, material: toResponse(item) });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${entityName}`, error: error.message });
  }
});

// PUT /api/material/edit/:id
materialRouter.put('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { materials_type, subcommodity, commodity, is_insurance_available, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: 'ID is required' });
    if (!materials_type || !String(materials_type).trim()) {
      return res.status(400).json({ message: 'materials_type is required' });
    }

    const resolvedId = await resolveToObjectId(Material, id);
    if (!resolvedId) return res.status(404).json({ message: `${entityName} not found` });

    const updated = await Material.findByIdAndUpdate(
      resolvedId,
      {
        materials_type: String(materials_type).trim(),
        subcommodity: subcommodity != null ? String(subcommodity).trim() : undefined,
        commodity: commodity != null ? String(commodity).trim() : undefined,
        is_insurance_available: is_insurance_available != null ? Boolean(is_insurance_available) : undefined,
      },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: `${entityName} not found` });

    const newLog = new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `updated ${entityName}: ${updated.materials_type} (${id})`,
    });
    await newLog.save();

    res.status(200).json({ message: `${entityName} updated successfully`, material: toResponse(updated) });
  } catch (error) {
    res.status(500).json({ message: `Error updating ${entityName}`, error: error.message });
  }
});

// DELETE /api/material/delete
materialRouter.delete('/delete', async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0) return res.status(400).json({ message: 'ids array is required (e.g. ids: ["id1", "id2"])' });

    const resolvedIds = await resolveIdsToObjectIds(Material, idList);
    const result = await Material.deleteMany({ _id: { $in: resolvedIds } });
    const deletedCount = result.deletedCount || 0;

    const newLog = new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `deleted ${deletedCount} ${entityName}(s): ${idList.join(', ')}`,
    });
    await newLog.save();

    res.status(200).json({
      message: deletedCount === 0 ? `No ${entityName}s found to delete` : `${deletedCount} ${entityName}(s) deleted successfully`,
      deletedCount,
      ids: idList,
    });
  } catch (error) {
    res.status(500).json({ message: `Error deleting ${entityName}s`, error: error.message });
  }
});

module.exports = materialRouter;
