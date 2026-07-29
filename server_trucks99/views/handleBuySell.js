const express = require('express');
const BuySell = require('../schema/buySell');
const Log = require('../schema/log');
const { findByIdOrUuid, resolveToObjectId, resolveIdsToObjectIds, toResponse, toResponseList } = require('../helpers/uuidHelper');

const buySellRouter = express.Router();
const entityName = 'buy/sell';

// GET /api/buysell/all
buySellRouter.get('/all', async (req, res) => {
  try {
    const list = await BuySell.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(toResponseList(list));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}`, error: error.message });
  }
});

// GET /api/buysell/:id (id can be uuid or _id)
buySellRouter.get('/:id', async (req, res) => {
  try {
    const item = await findByIdOrUuid(BuySell, req.params.id);
    if (!item) return res.status(404).json({ message: `${entityName} not found` });
    res.status(200).json(toResponse(item));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}`, error: error.message });
  }
});

// POST /api/buysell/add
buySellRouter.post('/add', async (req, res) => {
  try {
    const { name, description, contactEmail, contactMobile, address, type, status, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};
    const createdBy = req.isAuthenticated() ? req.user._id : undefined;

    // Generate sequential bsNumber
    const lastRecord = await BuySell.findOne().sort({ createdAt: -1 }).lean();
    let nextNumber = 1;
    if (lastRecord && lastRecord.bsNumber) {
      const match = lastRecord.bsNumber.match(/^BS(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const formattedNumber = String(nextNumber).padStart(3, '0');
    
    // Format current date as DD-MM-YYYY
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    const bsNumber = `BS${formattedNumber} - ${dateStr}`;

    const item = await BuySell.create({
      name: name || 'Untitled',
      description,
      contactEmail,
      contactMobile,
      address,
      type: type || 'buy',
      status: status || 'active',
      createdBy,
      bsNumber,
    });

    const newLog = new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `added new ${entityName}: ${item.name} (${item._id})`,
    });
    await newLog.save();

    res.status(201).json({ message: `${entityName} created successfully`, buySell: toResponse(item) });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${entityName}`, error: error.message });
  }
});

// PUT /api/buysell/edit/:id
buySellRouter.put('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, contactEmail, contactMobile, address, type, status, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: 'ID is required' });

    const resolvedId = await resolveToObjectId(BuySell, id);
    if (!resolvedId) return res.status(404).json({ message: `${entityName} not found` });

    const updated = await BuySell.findByIdAndUpdate(
      resolvedId,
      { name, description, contactEmail, contactMobile, address, type, status },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: `${entityName} not found` });

    const newLog = new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `updated ${entityName}: ${updated.name} (${id})`,
    });
    await newLog.save();

    res.status(200).json({ message: `${entityName} updated successfully`, buySell: toResponse(updated) });
  } catch (error) {
    res.status(500).json({ message: `Error updating ${entityName}`, error: error.message });
  }
});

// DELETE /api/buysell/delete
buySellRouter.delete('/delete', async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0) return res.status(400).json({ message: 'ids array is required (e.g. ids: ["id1", "id2"])' });

    const resolvedIds = await resolveIdsToObjectIds(BuySell, idList);
    const result = await BuySell.deleteMany({ _id: { $in: resolvedIds } });
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
      message: deletedCount === 0 ? `No ${entityName} found to delete` : `${deletedCount} ${entityName}(s) deleted successfully`,
      deletedCount,
      ids: idList,
    });
  } catch (error) {
    res.status(500).json({ message: `Error deleting ${entityName}`, error: error.message });
  }
});

module.exports = buySellRouter;