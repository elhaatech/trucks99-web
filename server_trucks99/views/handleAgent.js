const express = require('express');
const Agent = require('../schema/agent');
const User = require('../schema/user');
const Log = require('../schema/log');
const { findByIdOrUuid, resolveToObjectId, resolveIdsToObjectIds, toResponse, toResponseList } = require('../helpers/uuidHelper');

const agentRouter = express.Router();
const entityName = 'agent';

// GET /api/agent/all
agentRouter.get('/all', async (req, res) => {
  try {
    const list = await Agent.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(toResponseList(list));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}`, error: error.message });
  }
});

// GET /api/agent/my?userId=xxx — agents linked to this user (createdBy). userId can be uuid or _id
agentRouter.get('/my', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || !String(userId).trim()) {
      return res.status(400).json({ message: 'Query userId is required for GET /api/agent/my' });
    }
    const resolvedUserId = await resolveToObjectId(User, String(userId).trim());
    if (!resolvedUserId) return res.status(404).json({ message: 'User not found' });
    const list = await Agent.find({ createdBy: resolvedUserId }).sort({ createdAt: -1 }).lean();
    res.status(200).json(toResponseList(list));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching my agents', error: error.message });
  }
});

// GET /api/agent/:id (id can be uuid or _id)
agentRouter.get('/:id', async (req, res) => {
  try {
    const item = await findByIdOrUuid(Agent, req.params.id);
    if (!item) return res.status(404).json({ message: `${entityName} not found` });
    res.status(200).json(toResponse(item));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}`, error: error.message });
  }
});

// POST /api/agent/add
agentRouter.post('/add', async (req, res) => {
  try {
    const { name, description, contactEmail, contactMobile, region, status, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};
    const createdBy = req.isAuthenticated() ? req.user._id : undefined;

    const item = await Agent.create({
      name: name || 'Untitled',
      description,
      contactEmail,
      contactMobile,
      region,
      status: status || 'active',
      createdBy,
    });

    const newLog = new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `added new ${entityName}: ${item.name} (${item._id})`,
    });
    await newLog.save();

    res.status(201).json({ message: `${entityName} created successfully`, agent: toResponse(item) });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${entityName}`, error: error.message });
  }
});

// PUT /api/agent/edit/:id
agentRouter.put('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, contactEmail, contactMobile, region, status, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: 'ID is required' });

    const resolvedId = await resolveToObjectId(Agent, id);
    if (!resolvedId) return res.status(404).json({ message: `${entityName} not found` });

    const updated = await Agent.findByIdAndUpdate(
      resolvedId,
      { name, description, contactEmail, contactMobile, region, status },
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

    res.status(200).json({ message: `${entityName} updated successfully`, agent: toResponse(updated) });
  } catch (error) {
    res.status(500).json({ message: `Error updating ${entityName}`, error: error.message });
  }
});

// DELETE /api/agent/delete
agentRouter.delete('/delete', async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0) return res.status(400).json({ message: 'ids array is required (e.g. ids: ["id1", "id2"])' });

    const resolvedIds = await resolveIdsToObjectIds(Agent, idList);
    const result = await Agent.deleteMany({ _id: { $in: resolvedIds } });
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

module.exports = agentRouter;
