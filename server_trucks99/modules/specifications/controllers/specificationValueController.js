const multer = require('multer');
const XLSX = require('xlsx');
const SpecificationValue = require('../../../schema/specificationValueModel');
const {
  actorName,
  listSpecificationValues,
  ensureSelectableSpecification,
  resolveSpecificationId,
  resolveSpecificationValueId,
} = require('../services/specificationService');
const { toResponse, toResponseList } = require('../../../helpers/uuidHelper');

const STATUS_ENUM = ['Active', 'Inactive'];

// ─── EXCEL BULK-UPLOAD SETUP (memory storage — parsed in-memory, no disk write) ──
const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function parsePayload(body) {
  return {
    specification_id: body?.specification_id ? String(body.specification_id).trim() : '',
    subcategory_id: body?.subcategory_id ? String(body.subcategory_id).trim() : '',
    specification_value_name: body?.specification_value_name ? String(body.specification_value_name).trim() : '',
    status: body?.status ? String(body.status).trim() : undefined,
  };
}

async function createSpecificationValue(req, res) {
  try {
    const payload = parsePayload(req.body);
    if (!payload.specification_id) {
      return res.status(400).json({ message: 'specification_id is required' });
    }
    if (!payload.subcategory_id) {
      return res.status(400).json({ message: 'subcategory_id is required' });
    }
    if (!payload.specification_value_name) {
      return res.status(400).json({ message: 'specification_value_name is required' });
    }

    const check = await ensureSelectableSpecification(payload.specification_id);
    if (check.error) return res.status(400).json({ message: check.error });
    const specificationObjectId = await resolveSpecificationId(payload.specification_id);

    const now = new Date();
    const actor = actorName(req);
    const item = await SpecificationValue.create({
      specification_id: specificationObjectId,
      subcategory_id: payload.subcategory_id,
      specification_value_name: payload.specification_value_name,
      status: payload.status && STATUS_ENUM.includes(payload.status) ? payload.status : 'Active',
      created_date: now,
      created_by: actor,
      updated_date: now,
      updated_by: actor,
    });

    return res.status(201).json({ message: 'Specification value created successfully', specification_value: toResponse(item) });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating specification value', error: error?.message || String(error) });
  }
}

async function updateSpecificationValue(req, res) {
  try {
    const payload = parsePayload(req.body);
    if (!payload.specification_id) {
      return res.status(400).json({ message: 'specification_id is required' });
    }
    if (!payload.subcategory_id) {
      return res.status(400).json({ message: 'subcategory_id is required' });
    }
    if (!payload.specification_value_name) {
      return res.status(400).json({ message: 'specification_value_name is required' });
    }
    if (!payload.status || !STATUS_ENUM.includes(payload.status)) {
      return res.status(400).json({ message: 'status must be Active or Inactive' });
    }

    const specificationValueObjectId = await resolveSpecificationValueId(req.params.id);
    if (!specificationValueObjectId) return res.status(404).json({ message: 'Specification value not found' });

    const check = await ensureSelectableSpecification(payload.specification_id);
    if (check.error) return res.status(400).json({ message: check.error });
    const specificationObjectId = await resolveSpecificationId(payload.specification_id);

    const updated = await SpecificationValue.findByIdAndUpdate(
      specificationValueObjectId,
      {
        specification_id: specificationObjectId,
        subcategory_id: payload.subcategory_id,
        specification_value_name: payload.specification_value_name,
        status: payload.status,
        updated_date: new Date(),
        updated_by: actorName(req),
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'Specification value not found' });
    return res.status(200).json({ message: 'Specification value updated successfully', specification_value: toResponse(updated) });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating specification value', error: error?.message || String(error) });
  }
}

async function deleteSpecificationValue(req, res) {
  try {
    const resolvedId = await resolveSpecificationValueId(req.params.id);
    if (!resolvedId) return res.status(404).json({ message: 'Specification value not found' });

    const deleted = await SpecificationValue.findByIdAndDelete(resolvedId).lean();
    if (!deleted) return res.status(404).json({ message: 'Specification value not found' });
    return res.status(200).json({ message: 'Specification value deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting specification value', error: error?.message || String(error) });
  }
}

async function getSpecificationValues(req, res) {
  try {
    const { search = '', status = '', specification_id = '', specification_value_id = '', subcategory_id = '' } = req.query;
    if (status && !STATUS_ENUM.includes(String(status))) {
      return res.status(400).json({ message: 'status must be Active or Inactive' });
    }
    const rows = await listSpecificationValues({
      search: String(search || '').trim(),
      status: String(status || '').trim(),
      specification_id: String(specification_id || '').trim(),
      specification_value_id: String(specification_value_id || '').trim(),
      subcategory_id: String(subcategory_id || '').trim(),
    });
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching specification values', error: error?.message || String(error) });
  }
}

// ─── BULK UPLOAD (EXCEL) ────────────────────────────────────────────────────
// POST /specification-values/bulk-upload   (multipart/form-data, field name: "file")
//
// Excel headers (row 1) must match exactly:
//   Specification ID | Sub Category ID | Specification Value Name | Status
//
// "Specification ID" -> the parent specification's id (uuid) or its Mongo _id.
// "Sub Category ID"   -> the sub category's id (uuid) this value belongs to.
// "Status" -> Active / Inactive (defaults to Active)
async function bulkUploadSpecificationValues(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'Excel file is required (form field name: file)' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ message: 'Excel file has no data rows' });
    }

    const actor = actorName(req);
    const now = new Date();

    const result = { total: rows.length, inserted: 0, skipped: 0, errors: [] };
    const docsToInsert = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header row + 1-indexing

      try {
        const specificationIdRaw = String(row['Specification ID'] || '').trim();
        const subcategoryIdRaw = String(row['Sub Category ID'] || '').trim();
        const specification_value_name = String(row['Specification Value Name'] || '').trim();

        if (!specificationIdRaw) throw new Error('Missing "Specification ID"');
        if (!subcategoryIdRaw) throw new Error('Missing "Sub Category ID"');
        if (!specification_value_name) throw new Error('Missing "Specification Value Name"');

        // ✅ same lookup/validation used by create/update
        const check = await ensureSelectableSpecification(specificationIdRaw);
        if (check.error) throw new Error(check.error);

        const specificationObjectId = await resolveSpecificationId(specificationIdRaw);

        const status = STATUS_ENUM.includes(String(row['Status'] || '').trim())
          ? String(row['Status']).trim()
          : 'Active';

        docsToInsert.push({
          specification_id: specificationObjectId,
          subcategory_id: subcategoryIdRaw,
          specification_value_name,
          status,
          created_date: now,
          created_by: actor,
          updated_date: now,
          updated_by: actor,
        });
      } catch (rowErr) {
        result.skipped++;
        result.errors.push({ row: rowNum, message: rowErr.message });
      }
    }

    let inserted = [];
    if (docsToInsert.length) {
      // ordered:false -> one bad doc doesn't block the rest of the batch
      inserted = await SpecificationValue.insertMany(docsToInsert, { ordered: false });
      result.inserted = inserted.length;
    }

    return res.status(200).json({
      message: 'Bulk upload completed for Specification Value',
      ...result,
      created: toResponseList(inserted),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error bulk uploading specification values',
      error: error?.message || String(error),
    });
  }
}

module.exports = {
  createSpecificationValue,
  updateSpecificationValue,
  deleteSpecificationValue,
  getSpecificationValues,
  bulkUploadSpecificationValues,
  bulkUpload, // multer middleware — mount as bulkUpload.single("file") in the router
};