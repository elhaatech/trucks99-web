// vehicleBodyTypeRouter - updated
const express = require("express");
const VehicleBodyType = require("../schema/vehicleBodyType");
const Log = require("../schema/log");
const {
  findByIdOrUuid,
  resolveToObjectId,
  generateUuid,
} = require("../helpers/uuidHelper");

const vehicleBodyTypeRouter = express.Router();
const entityName = "vehicle-body-type";

/** Format for API response */
function formatItem(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };

  const hasWheels = obj.has_wheel_variants === "Yes";
  const hasLengths = obj.has_length_variants === "Yes";

  return {
    vehicle_id: obj.id || obj.uuid || obj._id?.toString(),
    vehicle_name: obj.vehicle_name || obj.name || "",
    image: obj.image || "",
    status: obj.status || "active",
    has_wheel_variants: obj.has_wheel_variants || "No",
    available_wheels_count: hasWheels ? obj.available_wheels_count || [] : [],
    has_length_variants: obj.has_length_variants || "No",
    available_lengths: hasLengths ? obj.available_lengths || [] : [],
    available_capacity_lengths: hasLengths
      ? obj.available_capacity_lengths || []
      : [],
  };
}

function formatList(docs) {
  return (docs || []).map((d) => formatItem(d));
}

/**
 * Extracts and validates wheel/length variant fields from request body.
 * Returns { fields, error } — if error is set, respond with 400.
 */
function extractVariantFields(body) {
  const {
    has_wheel_variants,
    available_wheels_count,
    has_length_variants,
    available_lengths,
    available_capacity_lengths,
  } = body;

  const fields = {};

  // --- Wheel variants ---
  if (has_wheel_variants != null) {
    if (!["Yes", "No"].includes(has_wheel_variants)) {
      return { error: 'has_wheel_variants must be "Yes" or "No"' };
    }
    fields.has_wheel_variants = has_wheel_variants;
  }

  const wheelFlag = has_wheel_variants ?? null;

  if (available_wheels_count != null) {
    if (wheelFlag === "No") {
      // Flag says No — clear the array silently, don't error
      fields.available_wheels_count = [];
    } else {
      if (!Array.isArray(available_wheels_count)) {
        return { error: "available_wheels_count must be an array" };
      }
      const invalid = available_wheels_count.find(
        (n) => !Number.isInteger(n) || n < 4 || n > 40 || n % 2 !== 0
      );
      if (invalid !== undefined) {
        return {
          error:
            "available_wheels_count values must be even integers between 4 and 40",
        };
      }
      fields.available_wheels_count = available_wheels_count;
    }
  } else if (wheelFlag === "No") {
    // has_wheel_variants sent as No but no array sent — still clear it
    fields.available_wheels_count = [];
  }

  // --- Length variants ---
  if (has_length_variants != null) {
    if (!["Yes", "No"].includes(has_length_variants)) {
      return { error: 'has_length_variants must be "Yes" or "No"' };
    }
    fields.has_length_variants = has_length_variants;
  }

  const lengthFlag = has_length_variants ?? null;

  if (available_lengths != null) {
    if (lengthFlag === "No") {
      // Flag says No — clear the array silently, don't error
      fields.available_lengths = [];
    } else {
      if (!Array.isArray(available_lengths)) {
        return { error: "available_lengths must be an array" };
      }
      const invalid = available_lengths.find(
        (n) => !Number.isInteger(n) || n < 6 || n > 50
      );
      if (invalid !== undefined) {
        return {
          error: "available_lengths values must be integers between 6 and 50",
        };
      }
      fields.available_lengths = available_lengths;
    }
  } else if (lengthFlag === "No") {
    // has_length_variants sent as No but no array sent — still clear it
    fields.available_lengths = [];
  }

  // --- Capacity lengths (companion to length variants) ---
  if (available_capacity_lengths != null) {
    if (lengthFlag === "No") {
      // Flag says No — clear the array silently, don't error
      fields.available_capacity_lengths = [];
    } else {
      if (!Array.isArray(available_capacity_lengths)) {
        return { error: "available_capacity_lengths must be an array" };
      }
      const invalid = available_capacity_lengths.find(
        (n) => !Number.isInteger(n) || n < 0
      );
      if (invalid !== undefined) {
        return {
          error:
            "available_capacity_lengths values must be non-negative integers",
        };
      }
      fields.available_capacity_lengths = available_capacity_lengths;
    }
  } else if (lengthFlag === "No") {
    // has_length_variants sent as No but no array sent — still clear it
    fields.available_capacity_lengths = [];
  }

  return { fields };
}

// GET /api/vehicle-body-type/all
vehicleBodyTypeRouter.get("/all", async (req, res) => {
  try {
    const list = await VehicleBodyType.find().sort({ vehicle_name: 1 }).lean();
    res.status(200).json(formatList(list));
  } catch (error) {
    res.status(500).json({
      message: `Error fetching ${entityName}s`,
      error: error?.message || String(error),
    });
  }
});

// GET /api/vehicle-body-type/:id
vehicleBodyTypeRouter.get("/:id", async (req, res) => {
  try {
    const item = await findByIdOrUuid(VehicleBodyType, req.params.id);
    if (!item)
      return res.status(404).json({ message: `${entityName} not found` });
    res.status(200).json(formatItem(item));
  } catch (error) {
    res.status(500).json({
      message: `Error fetching ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// POST /api/vehicle-body-type/add
vehicleBodyTypeRouter.post("/add", async (req, res) => {
  try {
    const { vehicle_name, vechicle_name, image, user, requestingUser } =
      req.body;
    const actor = user || requestingUser || req.user || {};

    const name = String(vehicle_name ?? vechicle_name ?? "").trim();
    if (!name) {
      return res.status(400).json({ message: "vehicle_name is required" });
    }

    const { fields: variantFields, error: variantError } =
      extractVariantFields(req.body);
    if (variantError) return res.status(400).json({ message: variantError });

    const newId = generateUuid();
    const item = await VehicleBodyType.create({
      id: newId,
      uuid: newId,
      vehicle_name: name,
      image: image ? String(image).trim() : "",
      ...variantFields,
    });

    const newLog = new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `added new ${entityName}: ${item.vehicle_name} (${item._id})`,
    });
    await newLog.save();

    res.status(201).json({
      message: `${entityName} created successfully`,
      vehicle_body_type: formatItem(item),
    });
  } catch (error) {
    res.status(500).json({
      message: `Error creating ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// PUT /api/vehicle-body-type/edit/:id
vehicleBodyTypeRouter.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_name, vechicle_name, image, user, requestingUser } =
      req.body;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: "ID is required" });

    const resolvedId = await resolveToObjectId(VehicleBodyType, id);
    if (!resolvedId)
      return res.status(404).json({ message: `${entityName} not found` });

    const { fields: variantFields, error: variantError } =
      extractVariantFields(req.body);
    if (variantError) return res.status(400).json({ message: variantError });

    const name = vehicle_name ?? vechicle_name;
    const updateFields = { ...variantFields };
    if (name != null) updateFields.vehicle_name = String(name).trim();
    if (image != null) updateFields.image = String(image).trim();

    const updated = await VehicleBodyType.findByIdAndUpdate(
      resolvedId,
      updateFields,
      { new: true, runValidators: true }
    ).lean();
    if (!updated)
      return res.status(404).json({ message: `${entityName} not found` });

    const newLog = new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `updated ${entityName}: ${updated.vehicle_name} (${id})`,
    });
    await newLog.save();

    res.status(200).json({
      message: `${entityName} updated successfully`,
      vehicle_body_type: formatItem(updated),
    });
  } catch (error) {
    res.status(500).json({
      message: `Error updating ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// DELETE /api/vehicle-body-type/delete
vehicleBodyTypeRouter.delete("/delete", async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0)
      return res.status(400).json({ message: "ids array is required" });

    const resolvedIds =
      await require("../helpers/uuidHelper").resolveIdsToObjectIds(
        VehicleBodyType,
        idList
      );
    const result = await VehicleBodyType.deleteMany({
      _id: { $in: resolvedIds },
    });
    const deletedCount = result.deletedCount || 0;

    const newLog = new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `deleted ${deletedCount} ${entityName}(s): ${idList.join(", ")}`,
    });
    await newLog.save();

    res.status(200).json({
      message:
        deletedCount === 0
          ? `No ${entityName}s found to delete`
          : `${deletedCount} ${entityName}(s) deleted successfully`,
      deletedCount,
      ids: idList,
    });
  } catch (error) {
    res.status(500).json({
      message: `Error deleting ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

module.exports = vehicleBodyTypeRouter;