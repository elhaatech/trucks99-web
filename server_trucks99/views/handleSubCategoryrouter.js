const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const SubCategory = require('../schema/subcategorymodel');
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

const subCategoryRouter = express.Router();
const entityName = 'sub-category';
const bulkUpload = multer({ storage: multer.memoryStorage() });

/** Resolve a category param (uuid or Mongo _id) to the uuid stored on sub-categories. */
async function resolveCategoryUuidForFilter(categoryParam) {
  if (!categoryParam) return null;
  const idStr = String(categoryParam).trim();
  if (!idStr) return null;

  const byUuid = await Category.findOne({ id: idStr }).select('id').lean();
  if (byUuid?.id) return String(byUuid.id);

  if (mongoose.Types.ObjectId.isValid(idStr)) {
    const byMongoId = await Category.findById(idStr).select('id uuid').lean();
    if (byMongoId?.id) return String(byMongoId.id);
    if (byMongoId?.uuid) return String(byMongoId.uuid);
  }

  return idStr;
}

async function buildSubCategoryListFilter(body = {}) {
  const {
    search,
    status,
    category_id,
    categoryId,
    sub_category_id,
    activeOnly,
    includeInactive,
  } = body;

  const filter = {};

  if (sub_category_id) filter.id = sub_category_id;

  const wantsActiveOnly =
    activeOnly === true ||
    activeOnly === 'true' ||
    String(activeOnly).toLowerCase() === 'true';

  const includeAllStatuses =
    includeInactive === true ||
    includeInactive === 'true' ||
    String(includeInactive).toLowerCase() === 'true';

  if (status) {
    filter.status = status;
  } else if (wantsActiveOnly && !includeAllStatuses) {
    filter.status = { $regex: /^active$/i };
  }

  const categoryParam = category_id ?? categoryId;
  if (search && Array.isArray(search) && search.length > 0) {
    const resolved = (
      await Promise.all(search.map((id) => resolveCategoryUuidForFilter(id)))
    ).filter(Boolean);
    if (resolved.length > 0) {
      filter.category_id = { $in: resolved };
    }
  } else if (categoryParam) {
    const resolvedCategoryId = await resolveCategoryUuidForFilter(categoryParam);
    if (resolvedCategoryId) filter.category_id = resolvedCategoryId;
  }

  return filter;
}

// GET /api/sub-category/all  (query params mirror POST body for simple clients)
// POST /api/sub-category/all
async function handleSubCategoryList(req, res) {
  try {
    const body =
      req.method === 'GET'
        ? { ...req.query, activeOnly: req.query.activeOnly ?? req.query.active_only }
        : req.body || {};

    const filter = await buildSubCategoryListFilter(body);

    const list = await SubCategory.find(filter)
      .select('_id id uuid category_id sub_category_name status created_by updated_by createdAt updatedAt')
      .sort({ sub_category_name: 1 })
      .lean();

    res.status(200).json(toResponseList(list));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}s`, error: error?.message || String(error) });
  }
}

subCategoryRouter.get('/all', handleSubCategoryList);
subCategoryRouter.post('/all', handleSubCategoryList);

// POST /api/sub-category/bulk-upload
subCategoryRouter.post('/bulk-upload', bulkUpload.single('file'), async (req, res) => {
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

    const categories = await Category.find({}, { id: 1 }).lean();
    const validCategoryIds = new Set(categories.map((item) => String(item.id || '').trim()));

    const existingSubCategories = await SubCategory.find({}, { category_id: 1, sub_category_name: 1 }).lean();
    const existingKeys = new Set(
      existingSubCategories.map((item) =>
        `${String(item.category_id || '').trim().toLowerCase()}|${String(item.sub_category_name || '').trim().toLowerCase()}`,
      ),
    );

    const result = { total: rows.length, inserted: 0, skipped: 0, errors: [] };
    const docsToInsert = [];
    const seenKeys = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const categoryIdRaw = String(row['Category ID'] || '').trim();
        const subCategoryName = String(row['Sub Category Name'] || '').trim();
        const status = String(row['Status'] || '').trim() || 'active';

        if (!categoryIdRaw) {
          throw new Error('Category ID is required');
        }
        if (!subCategoryName) {
          throw new Error('Sub Category Name is required');
        }
        if (!validCategoryIds.has(categoryIdRaw)) {
          throw new Error(`Category ID not found: ${categoryIdRaw}`);
        }

        const normalizedKey = `${categoryIdRaw.toLowerCase()}|${subCategoryName.toLowerCase()}`;
        if (existingKeys.has(normalizedKey) || seenKeys.has(normalizedKey)) {
          result.skipped += 1;
          result.errors.push({ row: rowNum, message: 'Sub-category already exists for this category' });
          continue;
        }

        seenKeys.add(normalizedKey);

        const newId = generateUuid();
        docsToInsert.push({
          id: newId,
          uuid: newId,
          category_id: categoryIdRaw,
          sub_category_name: subCategoryName,
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
      const inserted = await SubCategory.insertMany(docsToInsert, { ordered: false });
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

// GET /api/sub-category/:id
subCategoryRouter.get('/:id', async (req, res) => {
  try {
    const item = await findByIdOrUuid(SubCategory, req.params.id);
    if (!item) return res.status(404).json({ message: `${entityName} not found` });
    res.status(200).json(toResponse(item));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}`, error: error?.message || String(error) });
  }
});

// POST /api/sub-category/add
subCategoryRouter.post('/add', async (req, res) => {
  try {
    const { category_id, sub_category_name, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!category_id) {
      return res.status(400).json({ message: 'category_id is required' });
    }
    if (!sub_category_name || !String(sub_category_name).trim()) {
      return res.status(400).json({ message: 'sub_category_name is required' });
    }

    // Validate parent category exists
    const parentCategory = await Category.findOne({ id: category_id }).lean();
    if (!parentCategory) return res.status(404).json({ message: 'Parent category not found' });

    const newId = generateUuid();
    const item = await SubCategory.create({
      id: newId,
      uuid: newId,
      category_id,
      sub_category_name: String(sub_category_name).trim(),
      created_by: actor?.name || actor?.id || null,
      updated_by: actor?.name || actor?.id || null,
    });

    await new Log({
      name: actor?.name || 'unknown',
      email: actor?.mobile || '',
      role: actor?.role || '',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `added new ${entityName}: ${item.sub_category_name} (${item._id})`,
    }).save();

    res.status(201).json({ message: `${entityName} created successfully`, subCategory: toResponse(item) });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${entityName}`, error: error?.message || String(error) });
  }
});

// PUT /api/sub-category/edit/:id
subCategoryRouter.put('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, sub_category_name, status, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: 'ID is required' });

    const resolvedId = await resolveToObjectId(SubCategory, id);
    if (!resolvedId) return res.status(404).json({ message: `${entityName} not found` });

    // Validate parent category if being changed
    if (category_id != null) {
      const parentCategory = await Category.findOne({ id: category_id }).lean();
      if (!parentCategory) return res.status(404).json({ message: 'Parent category not found' });
    }

    const updateFields = {};
    if (category_id != null) updateFields.category_id = category_id;
    if (sub_category_name != null) updateFields.sub_category_name = String(sub_category_name).trim();
    if (status != null) updateFields.status = status;
    updateFields.updated_by = actor?.name || actor?.id || null;

    const updated = await SubCategory.findByIdAndUpdate(resolvedId, updateFields, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ message: `${entityName} not found` });

    await new Log({
      name: actor?.name || 'unknown',
      email: actor?.mobile || '',
      role: actor?.role || '',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `updated ${entityName}: ${updated.sub_category_name} (${id})`,
    }).save();

    res.status(200).json({ message: `${entityName} updated successfully`, subCategory: toResponse(updated) });
  } catch (error) {
    res.status(500).json({ message: `Error updating ${entityName}`, error: error?.message || String(error) });
  }
});

// DELETE /api/sub-category/delete
subCategoryRouter.delete('/delete', async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0) return res.status(400).json({ message: 'ids array is required' });

    const resolvedIds = await resolveIdsToObjectIds(SubCategory, idList);
    const result = await SubCategory.deleteMany({ _id: { $in: resolvedIds } });
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

module.exports = subCategoryRouter;