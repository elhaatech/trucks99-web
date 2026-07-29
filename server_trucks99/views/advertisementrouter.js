const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Advertisement = require("../schema/advertisement");
const Log = require("../schema/log");
const {
  findByIdOrUuid,
  resolveToObjectId,
  toResponse,
  toResponseList,
  generateUuid,
} = require("../helpers/uuidHelper");

const advertisementRouter = express.Router();
const entityName = "advertisement";

const AD_TYPES = Advertisement.AD_TYPES;
const DISPLAY_LOCATIONS = Advertisement.DISPLAY_LOCATIONS;

// ---------------------------------------------------------------------------
// Upload handling — image/video creative for Banner/Image/Video ad types.
// Swap storage/destination here for whatever upload convention the rest of
// the app already uses (e.g. S3) if this differs from the local-disk setup
// used elsewhere in the project.
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/ads";
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${generateUuid()}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB, generous enough for short video creatives
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(png|jpe?g|gif|webp)|video\/(mp4|webm|quicktime)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error("Unsupported file type for ad media"));
  },
});

function getActor(body, req) {
  return body.user || body.requestingUser || req.user || {};
}

function isTimeBoundActive(ad, now = new Date()) {
  return (
    ad.status === "Enabled" &&
    new Date(ad.startDate) <= now &&
    new Date(ad.expiryDate) >= now
  );
}

async function writeLog({ actor, action }) {
  const newLog = new Log({
    name: (actor && actor.name) || "unknown",
    email: (actor && actor.mobile) || "",
    role: (actor && actor.role) || "",
    timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
    action,
  });
  await newLog.save();
}

function validateAdPayload(body, { partial = false } = {}) {
  const errors = [];
  const {
    adTitle,
    clientName,
    adType,
    displayLocation,
    startDate,
    expiryDate,
  } = body;

  if (!partial || adTitle !== undefined) {
    if (!adTitle || !String(adTitle).trim()) errors.push("adTitle is required");
  }
  if (!partial || clientName !== undefined) {
    if (!clientName || !String(clientName).trim())
      errors.push("clientName is required");
  }
  if (!partial || adType !== undefined) {
    if (!AD_TYPES.includes(adType))
      errors.push(`adType must be one of: ${AD_TYPES.join(", ")}`);
  }
  if (!partial || displayLocation !== undefined) {
    if (!DISPLAY_LOCATIONS.includes(displayLocation))
      errors.push(`displayLocation must be one of: ${DISPLAY_LOCATIONS.join(", ")}`);
  }
  if (!partial || startDate !== undefined || expiryDate !== undefined) {
    const start = startDate ? new Date(startDate) : null;
    const expiry = expiryDate ? new Date(expiryDate) : null;
    if (startDate && isNaN(start.getTime())) errors.push("startDate is invalid");
    if (expiryDate && isNaN(expiry.getTime())) errors.push("expiryDate is invalid");
    if (start && expiry && start > expiry)
      errors.push("startDate must be before or equal to expiryDate");
  }

  return errors;
}

// ---------------------------------------------------------------------------
// GET /ads/active?location=home
// Public/frontend-facing: only enabled ads within their date window,
// matching the requested display location. Must be declared before
// GET /:id so "active" isn't swallowed as an id lookup.
// ---------------------------------------------------------------------------
advertisementRouter.get("/active", async (req, res) => {
  try {
    const { location } = req.query;
    if (!location) {
      return res.status(400).json({ message: "location query param is required" });
    }

    // Accept either the exact enum value ("Home Page") or a friendly slug
    // ("home", "home_page", "home-page") so callers don't need to know the
    // exact casing/spacing of the enum.
    const normalized = String(location).trim().toLowerCase().replace(/[_-]/g, " ");
    const match = DISPLAY_LOCATIONS.find(
      (loc) => loc.toLowerCase() === normalized || loc.toLowerCase().replace(/\s+/g, "") === normalized.replace(/\s+/g, ""),
    );
    if (!match) {
      return res.status(400).json({
        message: `Unknown display location. Expected one of: ${DISPLAY_LOCATIONS.join(", ")}`,
      });
    }

    const now = new Date();
    const ads = await Advertisement.find({
      displayLocation: match,
      status: "Enabled",
      startDate: { $lte: now },
      expiryDate: { $gte: now },
    })
      .sort({ displayPriority: 1, createdAt: -1 })
      .lean();

    res.status(200).json(toResponseList(ads));
  } catch (error) {
    res.status(500).json({
      message: `Error fetching active ${entityName}s`,
      error: error?.message || String(error),
    });
  }
});

// GET /ads
advertisementRouter.get("/", async (req, res) => {
  try {
    const { status, adType, displayLocation, clientName } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (adType) filter.adType = adType;
    if (displayLocation) filter.displayLocation = displayLocation;
    if (clientName) filter.clientName = { $regex: clientName, $options: "i" };

    const list = await Advertisement.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const enriched = list.map((ad) => ({
      ...ad,
      isActive: isTimeBoundActive(ad, now),
      isExpired: new Date(ad.expiryDate) < now,
    }));

    res.status(200).json(toResponseList(enriched));
  } catch (error) {
    res.status(500).json({
      message: `Error fetching ${entityName}s`,
      error: error?.message || String(error),
    });
  }
});

// GET /ads/:id
advertisementRouter.get("/:id", async (req, res) => {
  try {
    const item = await findByIdOrUuid(Advertisement, req.params.id);
    if (!item) return res.status(404).json({ message: `${entityName} not found` });

    const obj = item.toObject ? item.toObject() : { ...item };
    const now = new Date();
    obj.isActive = isTimeBoundActive(obj, now);
    obj.isExpired = new Date(obj.expiryDate) < now;

    res.status(200).json(toResponse(obj));
  } catch (error) {
    res.status(500).json({
      message: `Error fetching ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// POST /ads
advertisementRouter.post("/", upload.single("media"), async (req, res) => {
  try {
    const errors = validateAdPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join("; ") });

    const actor = getActor(req.body, req);
    const {
      adTitle,
      clientName,
      adType,
      description,
      redirectUrl,
      displayLocation,
      startDate,
      expiryDate,
      displayPriority,
    } = req.body;

    const mediaUrl = req.file
      ? `/uploads/ads/${req.file.filename}`
      : req.body.mediaUrl
        ? String(req.body.mediaUrl).trim()
        : "";

    const newId = generateUuid();
    const item = await Advertisement.create({
      id: newId,
      uuid: newId,
      adTitle: String(adTitle).trim(),
      clientName: String(clientName).trim(),
      adType,
      description: description ? String(description).trim() : "",
      mediaUrl,
      redirectUrl: redirectUrl ? String(redirectUrl).trim() : "",
      displayLocation,
      startDate: new Date(startDate),
      expiryDate: new Date(expiryDate),
      status: "Enabled",
      displayPriority: displayPriority != null ? Number(displayPriority) : 0,
      adSource: "manual",
      createdBy: {
        id: actor.id || actor._id || "",
        name: actor.name || "",
        role: actor.role || "",
      },
    });

    await writeLog({
      actor,
      action: `created new ${entityName}: ${item.adTitle} for client ${item.clientName} (${item._id})`,
    });

    res.status(201).json({
      message: `${entityName} created successfully`,
      advertisement: toResponse(item.toObject()),
    });
  } catch (error) {
    res.status(500).json({
      message: `Error creating ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// PUT /ads/:id
advertisementRouter.put("/:id", upload.single("media"), async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validateAdPayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ message: errors.join("; ") });

    const resolvedId = await resolveToObjectId(Advertisement, id);
    if (!resolvedId) return res.status(404).json({ message: `${entityName} not found` });

    const actor = getActor(req.body, req);
    const {
      adTitle,
      clientName,
      adType,
      description,
      redirectUrl,
      displayLocation,
      startDate,
      expiryDate,
      displayPriority,
      status,
    } = req.body;

    const updateFields = {};
    if (adTitle != null) updateFields.adTitle = String(adTitle).trim();
    if (clientName != null) updateFields.clientName = String(clientName).trim();
    if (adType != null) updateFields.adType = adType;
    if (description != null) updateFields.description = String(description).trim();
    if (redirectUrl != null) updateFields.redirectUrl = String(redirectUrl).trim();
    if (displayLocation != null) updateFields.displayLocation = displayLocation;
    if (startDate != null) updateFields.startDate = new Date(startDate);
    if (expiryDate != null) updateFields.expiryDate = new Date(expiryDate);
    if (displayPriority != null) updateFields.displayPriority = Number(displayPriority);
    if (status != null) {
      if (!["Enabled", "Disabled"].includes(status)) {
        return res.status(400).json({ message: "status must be Enabled or Disabled" });
      }
      updateFields.status = status;
    }
    if (req.file) {
      updateFields.mediaUrl = `/uploads/ads/${req.file.filename}`;
    } else if (req.body.mediaUrl != null) {
      updateFields.mediaUrl = String(req.body.mediaUrl).trim();
    }

    const updated = await Advertisement.findByIdAndUpdate(resolvedId, updateFields, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) return res.status(404).json({ message: `${entityName} not found` });

    await writeLog({
      actor,
      action: `updated ${entityName}: ${updated.adTitle} (${id})`,
    });

    res.status(200).json({
      message: `${entityName} updated successfully`,
      advertisement: toResponse(updated),
    });
  } catch (error) {
    res.status(500).json({
      message: `Error updating ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

// PATCH /ads/:id/status  { status: "Enabled" | "Disabled" }
advertisementRouter.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["Enabled", "Disabled"].includes(status)) {
      return res.status(400).json({ message: "status must be Enabled or Disabled" });
    }

    const resolvedId = await resolveToObjectId(Advertisement, id);
    if (!resolvedId) return res.status(404).json({ message: `${entityName} not found` });

    const updated = await Advertisement.findByIdAndUpdate(
      resolvedId,
      { status },
      { new: true },
    ).lean();
    if (!updated) return res.status(404).json({ message: `${entityName} not found` });

    const actor = getActor(req.body, req);
    await writeLog({
      actor,
      action: `set ${entityName} status to ${status}: ${updated.adTitle} (${id})`,
    });

    res.status(200).json({
      message: `${entityName} status updated to ${status}`,
      advertisement: toResponse(updated),
    });
  } catch (error) {
    res.status(500).json({
      message: `Error updating ${entityName} status`,
      error: error?.message || String(error),
    });
  }
});

// DELETE /ads/:id
advertisementRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const resolvedId = await resolveToObjectId(Advertisement, id);
    if (!resolvedId) return res.status(404).json({ message: `${entityName} not found` });

    const deleted = await Advertisement.findByIdAndDelete(resolvedId).lean();
    if (!deleted) return res.status(404).json({ message: `${entityName} not found` });

    const actor = getActor(req.body || {}, req);
    await writeLog({
      actor,
      action: `deleted ${entityName}: ${deleted.adTitle} (${id})`,
    });

    res.status(200).json({ message: `${entityName} deleted successfully`, id });
  } catch (error) {
    res.status(500).json({
      message: `Error deleting ${entityName}`,
      error: error?.message || String(error),
    });
  }
});

module.exports = advertisementRouter;