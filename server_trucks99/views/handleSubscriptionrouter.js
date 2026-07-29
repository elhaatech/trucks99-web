const express = require("express");
const Subscription = require("../schema/Subscriptionschema"); // ← Use new schema
const Log = require("../schema/log");
const {
  findByIdOrUuid,
  resolveToObjectId,
  resolveIdsToObjectIds,
  generateUuid,
} = require("../helpers/uuidHelper");
const { formatResponse } = require("../services/subscriptionService");

const subscriptionRouter = express.Router();
const entityName = "subscription";

// GET /api/subscription/all
subscriptionRouter.post("/all", async (req, res) => {
  try {
    const { packageType, fieldName } = req.body;

    const docs = await Subscription.find().sort({ createdAt: -1 }).lean();

    let result = docs.map((doc) => {
      let subscriptions = doc.subscriptions || [];

      // Filter by packageType if provided
      if (packageType) {
        subscriptions = subscriptions.filter(
          (item) => item.packageType === packageType
        );
      }

      // Filter by fieldName if provided
      if (fieldName) {
        subscriptions = subscriptions.filter(
          (item) => item.fieldName === fieldName
        );
      }

      return {
        _id: doc._id,
        subscriptions: subscriptions.reduce((acc, item) => {
          const key = item.fieldName?.toLowerCase();
          if (!key) return acc;
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {}),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    // Remove empty documents when filtering
    if (packageType || fieldName) {
      result = result.filter(
        (doc) => Object.keys(doc.subscriptions).length > 0
      );
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      message: `Error fetching ${entityName}s`,
      error: error?.message || String(error),
    });
  }
});

// GET /api/subscription/:id
subscriptionRouter.get("/:id", async (req, res) => {
  try {
    const doc = await findByIdOrUuid(Subscription, req.params.id);
    if (!doc)
      return res.status(404).json({ message: `${entityName} not found` });
    res.status(200).json(formatResponse(doc));
  } catch (error) {
    res.status(500).json({
      message: `Error fetching ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// POST /api/subscription/add — create new subscription document
subscriptionRouter.post("/add", async (req, res) => {
  try {
    const { subscriptions, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return res
        .status(400)
        .json({ message: "subscriptions array is required" });
    }

    // Attach UUID to each item
    const items = subscriptions.map((item) => ({
      ...item,
      id: item.id || generateUuid(),
    }));

    const doc = await Subscription.create({ subscriptions: items });

    const newLog = new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `added new ${entityName} (${doc._id}) with ${items.length} item(s)`,
    });
    await newLog.save();

    res.status(201).json({
      message: `${entityName} created successfully`,
      subscription: formatResponse(doc),
    });
  } catch (error) {
    res.status(500).json({
      message: `Error creating ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// POST /api/subscription/add-items/:id — add items to existing doc
subscriptionRouter.post("/add-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { items, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items array is required" });
    }

    const resolvedId = await resolveToObjectId(Subscription, id);
    if (!resolvedId)
      return res.status(404).json({ message: `${entityName} not found` });

    const newItems = items.map((item) => ({
      ...item,
      id: item.id || generateUuid(),
    }));

    const doc = await Subscription.findByIdAndUpdate(
      resolvedId,
      { $push: { subscriptions: { $each: newItems } } },
      { new: true, runValidators: true }
    );

    const newLog = new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `added ${newItems.length} item(s) to ${entityName} (${id})`,
    });
    await newLog.save();

    res.status(200).json({
      message: "Item(s) added successfully",
      subscription: formatResponse(doc),
    });
  } catch (error) {
    res.status(500).json({
      message: `Error adding items to ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// PUT /api/subscription/edit-items/:id — edit items by UUID
subscriptionRouter.put("/edit-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { updates, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "updates array is required" });
    }

    const resolvedId = await resolveToObjectId(Subscription, id);
    if (!resolvedId)
      return res.status(404).json({ message: `${entityName} not found` });

    const doc = await Subscription.findById(resolvedId);
    if (!doc)
      return res.status(404).json({ message: `${entityName} not found` });

    const notFound = [];
    updates.forEach(({ id: itemId, ...fields }) => {
      const item = doc.subscriptions.find((s) => s.id === itemId);
      if (item) {
        Object.assign(item, fields);
      } else {
        notFound.push(itemId);
      }
    });

    await doc.save();

    const newLog = new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `updated ${updates.length - notFound.length} item(s) in ${entityName} (${id})`,
    });
    await newLog.save();

    res.status(200).json({
      message: "Item(s) updated successfully",
      notFound: notFound.length > 0 ? notFound : undefined,
      subscription: formatResponse(doc),
    });
  } catch (error) {
    res.status(500).json({
      message: `Error updating items in ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// DELETE /api/subscription/delete — delete subscription documents
subscriptionRouter.delete("/delete", async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0)
      return res.status(400).json({ message: "ids array is required" });

    const resolvedIds = await resolveIdsToObjectIds(Subscription, idList);
    const result = await Subscription.deleteMany({ _id: { $in: resolvedIds } });

    const newLog = new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `deleted ${result.deletedCount} ${entityName}(s): ${idList.join(", ")}`,
    });
    await newLog.save();

    res.status(200).json({
      message:
        result.deletedCount === 0
          ? `No ${entityName}s found to delete`
          : `${result.deletedCount} ${entityName}(s) deleted successfully`,
      deletedCount: result.deletedCount,
      ids: idList,
    });
  } catch (error) {
    res.status(500).json({
      message: `Error deleting ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// DELETE /api/subscription/delete-items/:id — delete items by UUID
subscriptionRouter.delete("/delete-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0)
      return res.status(400).json({ message: "ids array is required" });

    const resolvedId = await resolveToObjectId(Subscription, id);
    if (!resolvedId)
      return res.status(404).json({ message: `${entityName} not found` });

    const doc = await Subscription.findByIdAndUpdate(
      resolvedId,
      { $pull: { subscriptions: { id: { $in: idList } } } },
      { new: true }
    );

    const newLog = new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `deleted item(s) [${idList.join(", ")}] from ${entityName} (${id})`,
    });
    await newLog.save();

    res.status(200).json({
      message: "Item(s) deleted successfully",
      subscription: formatResponse(doc),
    });
  } catch (error) {
    res.status(500).json({
      message: `Error deleting items from ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

module.exports = subscriptionRouter;