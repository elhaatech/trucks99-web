const express = require("express");
const { requireAuth } = require("../../helpers/requireAuth");

const permissionRouter = express.Router();

permissionRouter.use((req, res, next) => {
  const isPublic =
    (req.method === "GET" && (req.path === "/" || req.path === "")) ||
    (req.method === "POST" && req.path === "/add");

  if (isPublic) return next();
  return requireAuth(req, res, next);
});

const Permission = require("../../schema/permission");
const Log = require("../../schema/log");
/** Normalize access flags - only keeps keys that exist in payload */
function normalizeAccess(access) {
  if (access == null || typeof access !== "object") {
    return {};
  }

  const result = {};
  for (const [key, value] of Object.entries(access)) {
    result[key] = Boolean(value);
  }
  return result;
}

/** Format a single permission document for API responses */
function formatPermissionResponse(permission) {
  const p =
    permission && (permission.toObject ? permission.toObject() : permission);
  if (!p) return p;
  return {
    _id: p._id,
    id: p.id,
    name: p.name,
    description: p.description,
    permissions: (p.permissions || []).map((item) => ({
      title_name: item.title_name,
      display_name: item.display_name,
      access: item.access, // ← return as-is, no normalizing
    })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ─── GET /api/permission ────────────────────────────────────────────────────
// Returns all permission groups
permissionRouter.get("/", async (req, res) => {
  try {
    const permissions = await Permission.find().lean();
    res.status(200).json(permissions.map(formatPermissionResponse));
  } catch (error) {
    console.error("[Permission Get Error]", error);
    res.status(500).json({
      message: "Error fetching permissions",
      error: error?.message || String(error),
    });
  }
});

// ─── POST /api/permission ───────────────────────────────────────────────────
// List permissions with optional search (searches top-level `name` and `description`)
permissionRouter.post("/", async (req, res) => {
  try {
    const search =
      req.body && typeof req.body.search === "string"
        ? req.body.search.trim()
        : "";

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    const permissions = await Permission.find(filter).lean();
    res.status(200).json(permissions.map(formatPermissionResponse));
  } catch (error) {
    console.error("[Permission Post List Error]", error);
    res.status(500).json({
      message: "Error fetching permissions",
      error: error?.message || String(error),
    });
  }
});

// ─── POST /api/permission/add ───────────────────────────────────────────────
// Create a new permission group  (NO TOKEN REQUIRED)
permissionRouter.post("/add", async (req, res) => {
  try {
    const { name, title_name, description, permissions, user } = req.body;

    const rawName =
      typeof name === "string"
        ? name
        : typeof title_name === "string"
          ? title_name
          : "";
    const trimmedName = rawName.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "name is required" });
    }

    const existing = await Permission.findOne({ name: trimmedName });
    if (existing) {
      return res.status(400).json({ message: "Permission already exists" });
    }

    const normalizedPermissions = Array.isArray(permissions)
      ? permissions
          .map((p) => ({
            title_name:
              typeof p.title_name === "string" ? p.title_name.trim() : "",
            display_name:
              typeof p.display_name === "string" ? p.display_name.trim() : "",
            access: normalizeAccess(p.access),
          }))
          .filter((p) => p.title_name !== "")
      : [];

    const newPermission = new Permission({
      name: trimmedName,
      description:
        typeof description === "string" ? description.trim() : undefined,
      permissions: normalizedPermissions,
    });

    await newPermission.save();

    const roleStr =
      typeof user?.role === "string" ? user.role : user?.role?.name || "";
    await new Log({
      name: (user && user.name) || "unknown",
      email: (user && user.mobile) || "",
      role: roleStr,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `added new permission group: ${trimmedName}`,
    }).save();

    const saved = await Permission.findById(newPermission._id).lean();
    return res.status(201).json(formatPermissionResponse(saved));
  } catch (error) {
    console.error("[Permission Add Error]", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Permission already exists" });
    }
    res.status(500).json({
      message: "Error adding permission",
      error: error?.message || String(error),
    });
  }
});

// ─── DELETE /api/permission/delete ─────────────────────────────────────────
// Delete a permission group by top-level `name`
permissionRouter.delete("/delete", async (req, res) => {
  try {
    const { name, user } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return res.status(400).json({ message: "name is required" });
    }

    // FIX: was querying { title_name } — title_name lives inside the nested
    //      permissions array, NOT at the top level. Top-level key is `name`.
    const permission = await Permission.findOneAndDelete({ name: trimmedName });
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    const roleStr =
      typeof user?.role === "string" ? user.role : user?.role?.name || "";
    await new Log({
      name: (user && user.name) || "unknown",
      email: (user && user.mobile) || "",
      role: roleStr,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `deleted permission group: ${trimmedName}`,
    }).save();

    res.status(200).json({
      message: `Permission '${trimmedName}' deleted successfully`,
      permission: formatPermissionResponse(
        permission.toObject ? permission.toObject() : permission,
      ),
    });
  } catch (error) {
    console.error("[Permission Delete Error]", error);
    res.status(500).json({
      message: "Error deleting permission",
      error: error?.message || String(error),
    });
  }
});

// ─── GET /api/permission/:id ───────────────────────────────────────────────
permissionRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findById(id).lean();

    if (!permission) {
      return res.status(404).json({
        message: "Permission not found",
      });
    }

    res.status(200).json(formatPermissionResponse(permission));
  } catch (error) {
    console.error("[Permission Get By ID Error]", error);

    res.status(500).json({
      message: "Error fetching permission",
      error: error?.message || String(error),
    });
  }
});
// ─── PUT /api/permission/edit ───────────────────────────────────────────────
// Update a permission group by top-level `name`
permissionRouter.put("/edit/:id", async (req, res) => {
  const { id } = req.params;

  const updated = await Permission.findByIdAndUpdate(
    id,
    {
      $set: {
        description: req.body.description,
        permissions: req.body.permissions,
      },
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    return res.status(404).json({
      message: "Permission not found",
    });
  }

  res.status(200).json(updated);
});

module.exports = permissionRouter;
