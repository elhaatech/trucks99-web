const express = require('express');
const Log = require('../schema/log');
const { resolveToObjectId, toResponse } = require('../helpers/uuidHelper');

const blockUnblockRouter = express.Router();

/**
 * Entity config: which model and which status values for block/unblock.
 * Add new entities here to support common block/unblock.
 */
const ENTITY_CONFIG = {
  agent: {
    getModel: () => require('../schema/agent'),
    blockValue: 'inactive',
    unblockValue: 'active',
    entityKey: 'agent',
  },
  shipper: {
    getModel: () => require('../schema/shipper'),
    blockValue: 'inactive',
    unblockValue: 'active',
    entityKey: 'shipper',
  },
  loader: {
    getModel: () => require('../schema/loader'),
    blockValue: 'inactive',
    unblockValue: 'active',
    entityKey: 'loader',
  },
  buySell: {
    getModel: () => require('../schema/buySell'),
    blockValue: 'inactive',
    unblockValue: 'active',
    entityKey: 'buySell',
  },
  driver: {
    getModel: () => require('../schema/driver'),
    blockValue: 'inactive',
    unblockValue: 'available',
    entityKey: 'driver',
  },
  'income-expense-category': {
    getModel: () => require('../schema/incomeExpenseCategory'),
    blockValue: 'Inactive',
    unblockValue: 'Active',
    entityKey: 'incomeExpenseCategory',
  },
  user: {
    getModel: () => require('../schema/user'),
    blockValue: 'inactive',
    unblockValue: 'active',
    entityKey: 'user',
  },
  'vehicle-type': {
    getModel: () => require('../schema/vehicleType'),
    blockValue: 'inactive',
    unblockValue: 'active',
    entityKey: 'vehicleType',
  },
  'vehicle-body-type': {
    getModel: () => require('../schema/vehicleBodyType'),
    blockValue: 'inactive',
    unblockValue: 'active',
    entityKey: 'vehicleBodyType',
  },
  material: {
    getModel: () => require('../schema/material'),
    blockValue: 'inactive',
    unblockValue: 'active',
    entityKey: 'material',
  },
  'income-expense': {
    getModel: () => require('../schema/incomeExpense'),
    blockValue: 'inactive',
    unblockValue: 'active',
    entityKey: 'incomeExpense',
  },
  'company-start-country': {
    getModel: () => require('../schema/companyStartCountry'),
    blockValue: 'inactive',
    unblockValue: 'active',
    entityKey: 'companyStartCountry',
  },
};

/**
 * POST /api/block-unblock
 * Body: { entity: string, id: string, action: 'block' | 'unblock' }
 * Common API to block or unblock any supported entity (updates status field).
 * The acting user is taken from the authenticated request (req.user); no user details are required in payload.
 */
blockUnblockRouter.post('/', async (req, res) => {
  try {
    const { entity, id, action } = req.body || {};
    const actor = req.user || {};

    if (!entity || !String(entity).trim()) {
      return res.status(400).json({ message: 'Payload entity is required (e.g. agent, driver, income-expense-category)' });
    }
    if (!id || !String(id).trim()) {
      return res.status(400).json({ message: 'Payload id is required' });
    }
    const actionNorm = String(action || '').toLowerCase();
    if (actionNorm !== 'block' && actionNorm !== 'unblock') {
      return res.status(400).json({ message: 'Payload action must be "block" or "unblock"' });
    }

    const config = ENTITY_CONFIG[String(entity).trim()];
    if (!config) {
      return res.status(400).json({
        message: `Unknown entity. Supported: ${Object.keys(ENTITY_CONFIG).join(', ')}`,
      });
    }

    const Model = config.getModel();
    const resolvedId = await resolveToObjectId(Model, String(id).trim());
    if (!resolvedId) {
      return res.status(404).json({ message: `${entity} not found` });
    }

    const statusValue = actionNorm === 'block' ? config.blockValue : config.unblockValue;
    const updated = await Model.findByIdAndUpdate(
      resolvedId,
      { status: statusValue },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: `${entity} not found` });
    }

    const newLog = new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `${actionNorm}ed ${entity}: ${updated.name ?? updated.categoryName ?? updated.id ?? id}`,
    });
    await newLog.save();

    const response = {
      message: `${entity} ${actionNorm}ed successfully`,
      [config.entityKey]: toResponse(updated),
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: 'Block/unblock failed', error: error.message });
  }
});

module.exports = blockUnblockRouter;
