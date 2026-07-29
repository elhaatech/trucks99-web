const express = require('express');
const IncomeExpenseCategory = require('../schema/incomeExpenseCategory');
const Log = require('../schema/log');
const { findByIdOrUuid, resolveToObjectId, resolveIdsToObjectIds, toResponse, toResponseList } = require('../helpers/uuidHelper');

const categoryRouter = express.Router();
const entityName = 'Income/Expense category';

// GET /api/income-expense-category/all
categoryRouter.get('/all', async (req, res) => {
  try {
    const list = await IncomeExpenseCategory.find().sort({ type: 1, categoryName: 1 }).lean();
    res.status(200).json(toResponseList(list));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}s`, error: error.message });
  }
});

// GET /api/income-expense-category/:id
categoryRouter.get('/:id', async (req, res) => {
  try {
    const item = await findByIdOrUuid(IncomeExpenseCategory, req.params.id);
    if (!item) return res.status(404).json({ message: `${entityName} not found` });
    res.status(200).json(toResponse(item));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}`, error: error.message });
  }
});

// POST /api/income-expense-category/add
categoryRouter.post('/add', async (req, res) => {
  try {
    const { type, categoryName, status, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!type || !['income', 'expense'].includes(String(type).toLowerCase())) {
      return res.status(400).json({ message: 'type is required and must be income or expense' });
    }
    if (!categoryName || !String(categoryName).trim()) {
      return res.status(400).json({ message: 'categoryName is required' });
    }

    const statusVal = status && String(status).trim() === 'Inactive' ? 'Inactive' : 'Active';

    const item = await IncomeExpenseCategory.create({
      type: String(type).toLowerCase(),
      categoryName: String(categoryName).trim(),
      status: statusVal,
    });

    const newLog = new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `added new ${entityName}: ${item.categoryName} (${item._id})`,
    });
    await newLog.save();

    res.status(201).json({ message: `${entityName} created successfully`, category: toResponse(item) });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${entityName}`, error: error.message });
  }
});

// PUT /api/income-expense-category/edit/:id
categoryRouter.put('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, categoryName, status, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: 'ID is required' });
    if (!type || !['income', 'expense'].includes(String(type).toLowerCase())) {
      return res.status(400).json({ message: 'type is required and must be income or expense' });
    }
    if (!categoryName || !String(categoryName).trim()) {
      return res.status(400).json({ message: 'categoryName is required' });
    }

    const resolvedId = await resolveToObjectId(IncomeExpenseCategory, id);
    if (!resolvedId) return res.status(404).json({ message: `${entityName} not found` });

    const statusVal = status && String(status).trim() === 'Inactive' ? 'Inactive' : 'Active';

    const updated = await IncomeExpenseCategory.findByIdAndUpdate(
      resolvedId,
      {
        type: String(type).toLowerCase(),
        categoryName: String(categoryName).trim(),
        status: statusVal,
      },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: `${entityName} not found` });

    const newLog = new Log({
      name: actor.name || 'unknown',
      email: actor.mobile || 'unknown',
      role: actor.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `updated ${entityName}: ${updated.categoryName} (${id})`,
    });
    await newLog.save();

    res.status(200).json({ message: `${entityName} updated successfully`, category: toResponse(updated) });
  } catch (error) {
    res.status(500).json({ message: `Error updating ${entityName}`, error: error.message });
  }
});

// DELETE /api/income-expense-category/delete
categoryRouter.delete('/delete', async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0) return res.status(400).json({ message: 'ids array is required (e.g. ids: ["id1", "id2"])' });

    const resolvedIds = await resolveIdsToObjectIds(IncomeExpenseCategory, idList);
    const result = await IncomeExpenseCategory.deleteMany({ _id: { $in: resolvedIds } });
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

module.exports = categoryRouter;
