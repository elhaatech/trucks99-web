const XLSX = require("xlsx");
const Log = require("../schema/log");
const { generateUuid } = require("./uuidHelper");

/**
 * Factory that creates a bulk-upload route handler for ANY mongoose model.
 * Reuse this in every router instead of writing a bulk upload endpoint per entity.
 *
 * @param {Object} options
 * @param {mongoose.Model} options.Model      - Model to insert rows into
 * @param {String} options.entityName          - Used in log/response messages (e.g. "vehicle-type")
 * @param {Array}  options.columns             - Column mapping, e.g.:
 *   [
 *     { header: "Vehicle Type", field: "vehicle_type", required: true, transform: v => String(v).trim() },
 *     { header: "Description", field: "description", transform: v => String(v || "").trim() },
 *   ]
 *   `header` = exact column header text in the excel sheet (row 1)
 *   `field`  = field name to save on the document
 *   `required` = throws a row-level error if missing/blank
 *   `transform` = optional function to clean/cast the cell value
 * @param {String} [options.uniqueField]       - Field to dedupe against existing DB records (skips duplicates)
 * @param {Function} [options.buildDoc]        - Optional custom (row, actor) => doc, bypasses `columns` entirely
 *
 * @returns {Function} Express route handler: (req, res) => {}
 *   Expects the excel file on req.file (use upload.single("file") middleware before this handler)
 */
function createBulkUploadHandler({
  Model,
  entityName,
  columns = [],
  uniqueField,
  buildDoc,
}) {
  return async function bulkUploadHandler(req, res) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Excel file is required (form field name: file)" });
      }

      // actor info can arrive as JSON string (multipart/form-data) or object (json body)
      const { user, requestingUser } = req.body || {};
      let actor = req.user || {};
      try {
        if (typeof user === "string") actor = JSON.parse(user);
        else if (user) actor = user;
        else if (typeof requestingUser === "string")
          actor = JSON.parse(requestingUser);
        else if (requestingUser) actor = requestingUser;
      } catch {
        // fall back silently to req.user / {}
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        return res.status(400).json({ message: "Excel file has no data rows" });
      }

      const result = {
        total: rows.length,
        inserted: 0,
        skipped: 0,
        errors: [], // { row, message }
      };

      // Preload existing values for dedupe (case-insensitive, trimmed)
      let existingSet = new Set();
      if (uniqueField) {
        const existing = await Model.find({}, { [uniqueField]: 1 }).lean();
        existingSet = new Set(
          existing
            .map((e) => e[uniqueField])
            .filter(Boolean)
            .map((v) => String(v).toLowerCase().trim()),
        );
      }

      const docsToInsert = [];

      rows.forEach((row, index) => {
        const rowNum = index + 2; // +2 = header row + 1-indexing
        try {
          let doc;
          if (typeof buildDoc === "function") {
            doc = buildDoc(row, actor);
          } else {
            doc = {};
            for (const col of columns) {
              const rawValue = row[col.header];
              const isBlank =
                rawValue === undefined ||
                rawValue === null ||
                String(rawValue).trim() === "";

              if (col.required && isBlank) {
                throw new Error(`Missing required column "${col.header}"`);
              }
              doc[col.field] = col.transform
                ? col.transform(rawValue)
                : isBlank
                  ? ""
                  : rawValue;
            }
          }

          const newId = generateUuid();
          doc.id = doc.id || newId;
          doc.uuid = doc.uuid || newId;

          if (uniqueField && doc[uniqueField]) {
            const key = String(doc[uniqueField]).toLowerCase().trim();
            if (existingSet.has(key)) {
              result.skipped++;
              result.errors.push({
                row: rowNum,
                message: `Duplicate ${uniqueField}: "${doc[uniqueField]}"`,
              });
              return;
            }
            existingSet.add(key);
          }

          docsToInsert.push(doc);
        } catch (rowErr) {
          result.skipped++;
          result.errors.push({ row: rowNum, message: rowErr.message });
        }
      });

      if (docsToInsert.length) {
        // ordered:false -> one bad doc doesn't block the rest
        const inserted = await Model.insertMany(docsToInsert, {
          ordered: false,
        });
        result.inserted = inserted.length;
      }

      const newLog = new Log({
        name: (actor && actor.name) || "unknown",
        email: (actor && actor.mobile) || "",
        role: (actor && actor.role) || "",
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        action: `bulk uploaded ${result.inserted} ${entityName}(s) via excel (${result.skipped} skipped)`,
      });
      await newLog.save();

      return res.status(200).json({
        message: `Bulk upload completed for ${entityName}`,
        ...result,
      });
    } catch (error) {
      return res.status(500).json({
        message: `Error bulk uploading ${entityName}`,
        error: error?.message || String(error),
      });
    }
  };
}

module.exports = { createBulkUploadHandler };