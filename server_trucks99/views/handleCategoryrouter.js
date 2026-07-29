const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const Category = require('../schema/categorymodel');
const Log = require('../schema/log');
const {
  findByIdOrUuid,
  resolveToObjectId,
  resolveIdsToObjectIds,
  toResponse,
  toResponseList,
  generateUuid,
} = require('../helpers/uuidHelper');

const categoryRouter = express.Router();
const entityName = 'category';
const bulkUpload = multer({ storage: multer.memoryStorage() });

// GET /api/category/all
categoryRouter.get('/all', async (req, res) => {
  try {
    const { search, status, id } = req.query;
    const filter = {};

    if (id) filter.id = id;
    if (status) {
      filter.status =
        String(status).toLowerCase() === "active"
          ? { $regex: /^active$/i }
          : status;
    }
    if (search) filter.category_name = { $regex: search.trim(), $options: 'i' };

    const list = await Category.find(filter).sort({ category_name: 1 }).lean();
    res.status(200).json(toResponseList(list));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}s`, error: error?.message || String(error) });
  }
});

// POST /api/category/bulk-upload
categoryRouter.post('/bulk-upload', bulkUpload.single('file'), async (req, res) => {
  try {
    const { user, requestingUser } = req.body || {};
    const actor = user || requestingUser || req.user || {};

    if (!actor || !actor.id) {
      return res.status(401).json({ message: 'Unauthorized user' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required (form field name: file)' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ message: 'Excel file has no data rows' });
    }

    const existingCategories = await Category.find({}, { category_name: 1 }).lean();
    const existingNames = new Set(
      existingCategories.map((item) => String(item.category_name || '').trim().toLowerCase()),
    );

    const result = { total: rows.length, inserted: 0, skipped: 0, errors: [] };
    const docsToInsert = [];
    const seenNames = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const categoryName = String(row['Category Name'] || '').trim();
        const status = String(row['Status'] || '').trim() || 'active';

        if (!categoryName) {
          throw new Error('Category Name is required');
        }

        const normalizedCategoryName = categoryName.toLowerCase();
        if (existingNames.has(normalizedCategoryName) || seenNames.has(normalizedCategoryName)) {
          result.skipped += 1;
          result.errors.push({ row: rowNum, message: 'Category already exists' });
          continue;
        }

        seenNames.add(normalizedCategoryName);

        const newId = generateUuid();
        docsToInsert.push({
          id: newId,
          uuid: newId,
          category_name: categoryName,
          status,
          created_by: actor?.name || actor?.id || null,
          updated_by: actor?.name || actor?.id || null,
        });
      } catch (rowError) {
        result.skipped += 1;
        result.errors.push({ row: rowNum, message: rowError?.message || String(rowError) });
      }
    }

    if (docsToInsert.length) {
      const inserted = await Category.insertMany(docsToInsert, { ordered: false });
      result.inserted = inserted.length;
    }

    await new Log({
      name: actor?.name || 'unknown',
      email: actor?.mobile || '',
      role: actor?.role || '',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `Bulk uploaded ${result.inserted} ${entityName}(s) via excel (${result.skipped} skipped)`,
    }).save();

    res.status(200).json({
      message: 'Bulk upload completed successfully',
      ...result,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error bulk uploading', error: error?.message || String(error) });
  }
});

// GET /api/category/:id
categoryRouter.get('/:id', async (req, res) => {
  try {
    const item = await findByIdOrUuid(Category, req.params.id);
    if (!item) return res.status(404).json({ message: `${entityName} not found` });
    res.status(200).json(toResponse(item));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}`, error: error?.message || String(error) });
  }
});

// POST /api/category/add
categoryRouter.post('/add', async (req, res) => {
  try {
    const { category_name, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!category_name || !String(category_name).trim()) {
      return res.status(400).json({ message: 'category_name is required' });
    }

    const newId = generateUuid();
    const item = await Category.create({
      id: newId,
      uuid: newId,
      category_name: String(category_name).trim(),
      created_by: actor?.name || actor?.id || null,
      updated_by: actor?.name || actor?.id || null,
    });

    await new Log({
      name: actor?.name || 'unknown',
      email: actor?.mobile || '',
      role: actor?.role || '',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `added new ${entityName}: ${item.category_name} (${item._id})`,
    }).save();

    res.status(201).json({ message: `${entityName} created successfully`, category: toResponse(item) });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${entityName}`, error: error?.message || String(error) });
  }
});

// PUT /api/category/edit/:id
categoryRouter.put('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, status, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: 'ID is required' });

    const resolvedId = await resolveToObjectId(Category, id);
    if (!resolvedId) return res.status(404).json({ message: `${entityName} not found` });

    const updateFields = {};
    if (category_name != null) updateFields.category_name = String(category_name).trim();
    if (status != null) updateFields.status = status;
    updateFields.updated_by = actor?.name || actor?.id || null;

    const updated = await Category.findByIdAndUpdate(resolvedId, updateFields, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ message: `${entityName} not found` });

    await new Log({
      name: actor?.name || 'unknown',
      email: actor?.mobile || '',
      role: actor?.role || '',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `updated ${entityName}: ${updated.category_name} (${id})`,
    }).save();

    res.status(200).json({ message: `${entityName} updated successfully`, category: toResponse(updated) });
  } catch (error) {
    res.status(500).json({ message: `Error updating ${entityName}`, error: error?.message || String(error) });
  }
});

// DELETE /api/category/delete
categoryRouter.delete('/delete', async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0) return res.status(400).json({ message: 'ids array is required' });

    const resolvedIds = await resolveIdsToObjectIds(Category, idList);
    const result = await Category.deleteMany({ _id: { $in: resolvedIds } });
    const deletedCount = result.deletedCount || 0;

    await new Log({
      name: actor?.name || 'unknown',
      email: actor?.mobile || '',
      role: actor?.role || '',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `deleted ${deletedCount} ${entityName}(s): ${idList.join(', ')}`,
    }).save();

    res.status(200).json({
      message: deletedCount === 0
        ? `No ${entityName}s found to delete`
        : `${deletedCount} ${entityName}(s) deleted successfully`,
      deletedCount,
      ids: idList,
    });
  } catch (error) {
    res.status(500).json({ message: `Error deleting ${entityName}`, error: error?.message || String(error) });
  }
});

module.exports = categoryRouter;