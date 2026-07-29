const multer = require("multer");
const XLSX = require("xlsx");
const Specification = require("../../../schema/specificationModel");
const SpecificationValue = require("../../../schema/specificationValueModel");
const {
  actorName,
  listSpecifications,
  findSpecificationOrNull,
  resolveSpecificationId,
} = require("../services/specificationService");
const { toResponse, toResponseList } = require("../../../helpers/uuidHelper");

const SPEC_TYPES = [
  "selectable",
  "input",
  "date",
  "datetime",
  "number",
  "file",
  "multiselect",
];
const REQUIRED_ENUM = ["Yes", "No"];
const NEED_FILTER_ENUM = ["Yes", "No"]; // ✅ added
const STATUS_ENUM = ["Active", "Inactive"];

// ─── EXCEL BULK-UPLOAD SETUP (memory storage — parsed in-memory, no disk write) ──
const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function parsePayload(body) {
  return {
    specification_name: body?.specification_name
      ? String(body.specification_name).trim()
      : "",
    type: body?.type ? String(body.type).trim() : undefined,
    is_required: body?.is_required
      ? String(body.is_required).trim()
      : undefined,
    need_filter: body?.need_filter
      ? String(body.need_filter).trim()
      : undefined,
    status: body?.status ? String(body.status).trim() : undefined,

    // number
    number_min: body?.number_min !== undefined ? body.number_min : null,
    number_max: body?.number_max !== undefined ? body.number_max : null,
    number_decimal: body?.number_decimal
      ? String(body.number_decimal).trim()
      : "No",

    // date / datetime
    date_min: body?.date_min ? String(body.date_min).trim() : null,
    date_max: body?.date_max ? String(body.date_max).trim() : null,

    // file
    file_max_size_mb:
      body?.file_max_size_mb !== undefined
        ? Number(body.file_max_size_mb)
        : null,
    file_allowed_types: Array.isArray(body?.file_allowed_types)
      ? body.file_allowed_types.map((t) => String(t).trim().toLowerCase())
      : [],
    file_multiple: body?.file_multiple
      ? String(body.file_multiple).trim()
      : "No",
  };
}

function buildTypeConfig(payload) {
  const type = payload.type;
  const config = {
    number_min: null,
    number_max: null,
    number_decimal: "No",
    date_min: null,
    date_max: null,
    file_max_size_mb: null,
    file_allowed_types: [],
    file_multiple: "No",
  };

  if (type === "number") {
    const min = payload.number_min !== null ? Number(payload.number_min) : null;
    const max = payload.number_max !== null ? Number(payload.number_max) : null;

    if (min !== null && isNaN(min))
      throw new Error("number_min must be a valid number");
    if (max !== null && isNaN(max))
      throw new Error("number_max must be a valid number");
    if (min !== null && max !== null && min > max)
      throw new Error("number_min cannot be greater than number_max");

    config.number_min = min;
    config.number_max = max;
    config.number_decimal = ["Yes", "No"].includes(payload.number_decimal)
      ? payload.number_decimal
      : "No";
  }

  if (type === "date" || type === "datetime") {
    config.date_min = payload.date_min || null;
    config.date_max = payload.date_max || null;
    if (config.date_min && isNaN(Date.parse(config.date_min)))
      throw new Error("date_min is not a valid date");
    if (config.date_max && isNaN(Date.parse(config.date_max)))
      throw new Error("date_max is not a valid date");
    if (
      config.date_min &&
      config.date_max &&
      new Date(config.date_min) > new Date(config.date_max)
    )
      throw new Error("date_min cannot be after date_max");
  }

  if (type === "file") {
    if (
      payload.file_max_size_mb !== null &&
      (!isFinite(payload.file_max_size_mb) || payload.file_max_size_mb <= 0)
    ) {
      throw new Error("file_max_size_mb must be a positive number");
    }
    config.file_max_size_mb = payload.file_max_size_mb;
    config.file_allowed_types = payload.file_allowed_types;
    config.file_multiple = ["Yes", "No"].includes(payload.file_multiple)
      ? payload.file_multiple
      : "No";
  }

  return config;
}

async function createSpecification(req, res) {
  try {
    const payload = parsePayload(req.body);

    if (!payload.specification_name) {
      return res
        .status(400)
        .json({ message: "specification_name is required" });
    }

    // ✅ try/catch so buildTypeConfig errors return 400, not 500
    let typeConfig;
    try {
      typeConfig = buildTypeConfig(payload);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    const now = new Date();
    const actor = actorName(req);

    const item = await Specification.create({
      specification_name: payload.specification_name,
      type:
        payload.type && SPEC_TYPES.includes(payload.type)
          ? payload.type
          : "input",
      is_required:
        payload.is_required && REQUIRED_ENUM.includes(payload.is_required)
          ? payload.is_required
          : "No",
      need_filter:
        payload.need_filter && NEED_FILTER_ENUM.includes(payload.need_filter)
          ? payload.need_filter
          : "No",
      status:
        payload.status && STATUS_ENUM.includes(payload.status)
          ? payload.status
          : "Active",
      ...typeConfig,
      created_date: now,
      created_by: actor,
      updated_date: now,
      updated_by: actor,
    });

    return res.status(201).json({
      message: "Specification created successfully",
      specification: toResponse(item),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating specification",
      error: error?.message || String(error),
    });
  }
}

async function updateSpecification(req, res) {
  try {
    const payload = parsePayload(req.body);

    if (!payload.specification_name) {
      return res
        .status(400)
        .json({ message: "specification_name is required" });
    }

    if (!payload.type || !SPEC_TYPES.includes(payload.type)) {
      return res
        .status(400)
        .json({ message: `type must be one of: ${SPEC_TYPES.join(", ")}` });
    }

    if (!payload.is_required || !REQUIRED_ENUM.includes(payload.is_required)) {
      return res.status(400).json({ message: "is_required must be Yes or No" });
    }

    if (
      !payload.need_filter ||
      !NEED_FILTER_ENUM.includes(payload.need_filter)
    ) {
      return res.status(400).json({ message: "need_filter must be Yes or No" });
    }

    if (!payload.status || !STATUS_ENUM.includes(payload.status)) {
      return res
        .status(400)
        .json({ message: "status must be Active or Inactive" });
    }

    // ✅ try/catch so buildTypeConfig errors return 400, not 500
    let typeConfig;
    try {
      typeConfig = buildTypeConfig(payload);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    const resolvedId = await resolveSpecificationId(req.params.id);
    if (!resolvedId) {
      return res.status(404).json({ message: "Specification not found" });
    }

    if (payload.type === "input") {
      const valuesCount = await SpecificationValue.countDocuments({
        specification_id: resolvedId,
      });

      if (valuesCount > 0) {
        return res.status(400).json({
          message:
            "Cannot change type to input while specification values exist. Delete values first.",
        });
      }
    }

    const updated = await Specification.findByIdAndUpdate(
      resolvedId,
      {
        specification_name: payload.specification_name,
        type: payload.type,
        is_required: payload.is_required,
        need_filter: payload.need_filter,
        status: payload.status,
        ...typeConfig, // ✅ was missing
        updated_date: new Date(),
        updated_by: actorName(req),
      },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Specification not found" });
    }

    return res.status(200).json({
      message: "Specification updated successfully",
      specification: toResponse(updated),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating specification",
      error: error?.message || String(error),
    });
  }
}

async function deleteSpecification(req, res) {
  try {
    const resolvedId = await resolveSpecificationId(req.params.id);
    if (!resolvedId) {
      return res.status(404).json({ message: "Specification not found" });
    }

    const valuesCount = await SpecificationValue.countDocuments({
      specification_id: resolvedId,
    });

    if (valuesCount > 0) {
      return res.status(400).json({
        message: "Cannot delete specification because values exist for it",
      });
    }

    const deleted = await Specification.findByIdAndDelete(resolvedId).lean();

    if (!deleted) {
      return res.status(404).json({ message: "Specification not found" });
    }

    return res.status(200).json({
      message: "Specification deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting specification",
      error: error?.message || String(error),
    });
  }
}

async function getSpecifications(req, res) {
  try {
    const { search = "", status = "", specification_id = "" } = req.query;

    if (status && !STATUS_ENUM.includes(String(status))) {
      return res.status(400).json({
        message: "status must be Active or Inactive",
      });
    }

    const rows = await listSpecifications({
      search: String(search || "").trim(),
      status: String(status || "").trim(),
      specification_id: String(specification_id || "").trim(),
    });

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching specifications",
      error: error?.message || String(error),
    });
  }
}

async function getSpecificationById(req, res) {
  try {
    const item = await findSpecificationOrNull(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Specification not found" });
    }

    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching specification",
      error: error?.message || String(error),
    });
  }
}

// ─── BULK UPLOAD (EXCEL) ────────────────────────────────────────────────────
// POST /specifications/bulk-upload   (multipart/form-data, field name: "file")
//
// Excel headers (row 1) must match exactly:
//   Specification Name | Type | Is Required | Need Filter | Status |
//   Number Min | Number Max | Number Decimal |
//   Date Min | Date Max |
//   File Max Size MB | File Allowed Types | File Multiple
//
// "Type" -> one of: selectable, input, date, datetime, number, file, multiselect (defaults to "input")
// "Is Required" / "Need Filter" / "Number Decimal" / "File Multiple" -> Yes / No
// "Status" -> Active / Inactive (defaults to Active)
// "File Allowed Types" -> comma-separated, e.g.  pdf, jpg, png
async function bulkUploadSpecifications(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Excel file is required (form field name: file)" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return res.status(400).json({ message: "Excel file has no data rows" });
    }

    const actor = actorName(req);
    const now = new Date();

    const result = { total: rows.length, inserted: 0, skipped: 0, errors: [] };
    const docsToInsert = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header row + 1-indexing

      try {
        const specification_name = String(row["Specification Name"] || "").trim();
        if (!specification_name) throw new Error('Missing "Specification Name"');

        const typeRaw = String(row["Type"] || "").trim();
        const type = SPEC_TYPES.includes(typeRaw) ? typeRaw : "input";

        const is_required = REQUIRED_ENUM.includes(String(row["Is Required"] || "").trim())
          ? String(row["Is Required"]).trim()
          : "No";

        const need_filter = NEED_FILTER_ENUM.includes(String(row["Need Filter"] || "").trim())
          ? String(row["Need Filter"]).trim()
          : "No";

        const status = STATUS_ENUM.includes(String(row["Status"] || "").trim())
          ? String(row["Status"]).trim()
          : "Active";

        const rawPayload = {
          type,
          number_min:
            row["Number Min"] !== "" && row["Number Min"] !== undefined
              ? row["Number Min"]
              : null,
          number_max:
            row["Number Max"] !== "" && row["Number Max"] !== undefined
              ? row["Number Max"]
              : null,
          number_decimal: String(row["Number Decimal"] || "No").trim(),
          date_min: row["Date Min"] ? String(row["Date Min"]).trim() : null,
          date_max: row["Date Max"] ? String(row["Date Max"]).trim() : null,
          file_max_size_mb:
            row["File Max Size MB"] !== "" && row["File Max Size MB"] !== undefined
              ? Number(row["File Max Size MB"])
              : null,
          file_allowed_types: row["File Allowed Types"]
            ? String(row["File Allowed Types"])
                .split(",")
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean)
            : [],
          file_multiple: String(row["File Multiple"] || "No").trim(),
        };

        // ✅ reuse the same validation/normalisation used by create/update
        const typeConfig = buildTypeConfig(rawPayload);

        docsToInsert.push({
          specification_name,
          type,
          is_required,
          need_filter,
          status,
          ...typeConfig,
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
      inserted = await Specification.insertMany(docsToInsert, { ordered: false });
      result.inserted = inserted.length;
    }

    return res.status(200).json({
      message: "Bulk upload completed for Specification",
      ...result,
      created: toResponseList(inserted),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error bulk uploading specifications",
      error: error?.message || String(error),
    });
  }
}

module.exports = {
  createSpecification,
  updateSpecification,
  deleteSpecification,
  getSpecifications,
  getSpecificationById,
  bulkUploadSpecifications,
  bulkUpload, // multer middleware — mount as bulkUpload.single("file") in the router
};