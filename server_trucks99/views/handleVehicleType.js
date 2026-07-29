const express = require("express");
const VehicleType = require("../schema/vehicleType");
const VehicleBodyType = require("../schema/vehicleBodyType");
const Log = require("../schema/log");
const {
  findByIdOrUuid,
  resolveToObjectId,
  toResponse,
  toResponseList,
  generateUuid,
} = require("../helpers/uuidHelper");

const vehicleTypeRouter = express.Router();
const entityName = "vehicle-type";

// helper: populate available_body_type by vehicle_id
async function populateBodyTypes(doc) {
  if (!doc) return doc;
  const ids = doc.available_body_type || [];
  if (ids.length === 0) return doc;

  // Try both 'id' and 'vehicle_id' to handle schema differences
  const bodyTypes = await VehicleBodyType.find({
    $or: [{ id: { $in: ids } }, { vehicle_id: { $in: ids } }],
  }).lean();

  doc.available_body_type = bodyTypes;
  return doc;
}

async function populateBodyTypesList(docs) {
  if (!docs || docs.length === 0) return docs;
  const allIds = [...new Set(docs.flatMap((d) => d.available_body_type || []))];
  if (allIds.length === 0) return docs;

  const bodyTypes = await VehicleBodyType.find({
    $or: [{ id: { $in: allIds } }, { vehicle_id: { $in: allIds } }],
  }).lean();

  // map by whichever field exists
  const bodyTypeMap = Object.fromEntries(
    bodyTypes.map((b) => [b.vehicle_id || b.id, b]),
  );

  return docs.map((d) => ({
    ...d,
    available_body_type: (d.available_body_type || []).map(
      (id) => bodyTypeMap[id] || id,
    ),
  }));
}

// GET /api/vehicle-type/all
vehicleTypeRouter.get("/all", async (req, res) => {
  try {
    const list = await VehicleType.find()
      .sort({ vehicle_type: 1, name: 1 })
      .lean();
    const populated = await populateBodyTypesList(list);
    res.status(200).json(toResponseList(populated));
  } catch (error) {
    res
      .status(500)
      .json({
        message: `Error fetching ${entityName}s`,
        error: error?.message || String(error),
      });
  }
});

// GET /api/vehicle-type/:id
vehicleTypeRouter.get("/:id", async (req, res) => {
  try {
    const item = await findByIdOrUuid(VehicleType, req.params.id);
    if (!item)
      return res.status(404).json({ message: `${entityName} not found` });
    const populated = await populateBodyTypes(
      item.toObject ? item.toObject() : { ...item },
    );
    res.status(200).json(toResponse(populated));
  } catch (error) {
    res
      .status(500)
      .json({
        message: `Error fetching ${entityName}`,
        error: error?.message || String(error),
      });
  }
});

// POST /api/vehicle-type/add
vehicleTypeRouter.post("/add", async (req, res) => {
  try {
    const {
      vehicle_type,
      description,
      minimumCapacity,
      maximumCapacity,
      image,
      available_body_type,
      user,
      requestingUser,
    } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!vehicle_type || !String(vehicle_type).trim()) {
      return res.status(400).json({ message: "vehicle_type is required" });
    }

    // validate available_body_type is array of strings
    const bodyTypeIds = Array.isArray(available_body_type)
      ? available_body_type.filter((id) => typeof id === "string" && id.trim())
      : [];

    const newId = generateUuid();
    const item = await VehicleType.create({
      id: newId,
      uuid: newId,
      vehicle_type: String(vehicle_type).trim(),
      description: description ? String(description).trim() : "",
      minimumCapacity:
        minimumCapacity != null ? String(minimumCapacity).trim() : "",
      maximumCapacity:
        maximumCapacity != null ? String(maximumCapacity).trim() : "",
      image: image ? String(image).trim() : "",
      available_body_type: bodyTypeIds,
    });

    const newLog = new Log({
      name: (actor && actor.name) || "unknown",
      email: (actor && actor.mobile) || "",
      role: (actor && actor.role) || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `added new ${entityName}: ${item.vehicle_type} (${item._id})`,
    });
    await newLog.save();

    const populated = await populateBodyTypes(item.toObject());
    res
      .status(201)
      .json({
        message: `${entityName} created successfully`,
        vehicleType: toResponse(populated),
      });
  } catch (error) {
    res
      .status(500)
      .json({
        message: `Error creating ${entityName}`,
        error: error?.message || String(error),
      });
  }
});

// PUT /api/vehicle-type/edit/:id
vehicleTypeRouter.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vehicle_type,
      description,
      minimumCapacity,
      maximumCapacity,
      image,
      available_body_type,
      user,
      requestingUser,
    } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: "ID is required" });

    const resolvedId = await resolveToObjectId(VehicleType, id);
    if (!resolvedId)
      return res.status(404).json({ message: `${entityName} not found` });

    const updateFields = {};
    if (vehicle_type != null)
      updateFields.vehicle_type = String(vehicle_type).trim();
    if (description != null)
      updateFields.description = String(description).trim();
    if (minimumCapacity != null)
      updateFields.minimumCapacity = String(minimumCapacity).trim();
    if (maximumCapacity != null)
      updateFields.maximumCapacity = String(maximumCapacity).trim();
    if (image != null) updateFields.image = String(image).trim();

    // only update if explicitly passed (even empty array to clear)
    if (available_body_type !== undefined) {
      updateFields.available_body_type = Array.isArray(available_body_type)
        ? available_body_type.filter(
            (id) => typeof id === "string" && id.trim(),
          )
        : [];
    }

    const updated = await VehicleType.findByIdAndUpdate(
      resolvedId,
      updateFields,
      { new: true, runValidators: true },
    ).lean();
    if (!updated)
      return res.status(404).json({ message: `${entityName} not found` });

    const newLog = new Log({
      name: (actor && actor.name) || "unknown",
      email: (actor && actor.mobile) || "",
      role: (actor && actor.role) || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `updated ${entityName}: ${updated.vehicle_type} (${id})`,
    });
    await newLog.save();

    const populated = await populateBodyTypes(updated);
    res
      .status(200)
      .json({
        message: `${entityName} updated successfully`,
        vehicleType: toResponse(populated),
      });
  } catch (error) {
    res
      .status(500)
      .json({
        message: `Error updating ${entityName}`,
        error: error?.message || String(error),
      });
  }
});

// DELETE /api/vehicle-type/delete
vehicleTypeRouter.delete("/delete", async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0)
      return res.status(400).json({ message: "ids array is required" });

    const resolvedIds =
      await require("../helpers/uuidHelper").resolveIdsToObjectIds(
        VehicleType,
        idList,
      );
    const result = await VehicleType.deleteMany({ _id: { $in: resolvedIds } });
    const deletedCount = result.deletedCount || 0;

    const newLog = new Log({
      name: (actor && actor.name) || "unknown",
      email: (actor && actor.mobile) || "",
      role: (actor && actor.role) || "",
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
    res
      .status(500)
      .json({
        message: `Error deleting ${entityName}`,
        error: error?.message || String(error),
      });
  }
});

module.exports = vehicleTypeRouter;
