const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../../helpers/requireAuth");

const roleRouter = express.Router();

roleRouter.use((req, res, next) => {
  if (req.method === "GET" && (req.path === "/" || req.path === ""))
    return next();
  if (req.method === "POST" && (req.path === "/" || req.path === ""))
    return next(); // ← ADD THIS
  if (req.method === "POST" && req.path === "/add") return next();

  return requireAuth(req, res, next);
});

const Role = require("../../schema/role");
const Permission = require("../../schema/permission");
const Log = require("../../schema/log");

/**
 * Resolve single permission input → MongoDB ObjectId
 * Accepts:
 * - UUID string
 * - Mongo ObjectId string
 * - Permission name
 */
async function resolvePermissionId(permission) {
  if (!permission) return null;

  const val =
    typeof permission === "object"
      ? permission._id || permission.id || permission
      : permission;

  const str = String(val).trim();
  if (!str) return null;

  let doc = null;

  // 1. UUID field
  doc = await Permission.findOne({ id: str }).select("_id").lean();

  // 2. Mongo ObjectId
  if (!doc && mongoose.Types.ObjectId.isValid(str) && str.length === 24) {
    doc = await Permission.findById(str).select("_id").lean();
  }

  // 3. Permission name
  if (!doc) {
    doc = await Permission.findOne({ name: str }).select("_id").lean();
  }

  return doc ? doc._id : null;
}

/**
 * Normalize access flags
 */
// ✅ FIXED - returns exactly what's stored in DB
// ✅ FIXED normalizeAccess in role.js
function normalizeAccess(access) {
  if (!access || typeof access !== "object") return {};
  const result = {};
  for (const [key, value] of Object.entries(access)) {
    result[key] = Boolean(value);
  }
  return result;
}
/**
 * Format role response
 */
async function formatRoleResponse(role) {
  const r = role && (role.toObject ? role.toObject() : role);

  if (!r) return r;

  let permission = null;

  if (r.permissions) {
    // If already populated object
    if (
      typeof r.permissions === "object" &&
      !mongoose.Types.ObjectId.isValid(r.permissions)
    ) {
      permission = r.permissions;
    } else {
      permission = await Permission.findById(r.permissions).lean();
    }
  }
  return {
    _id: r._id,
    id: r.id,
    name: r.name,
    status: r.status ?? "user",
    description: r.description,

    permissions: permission
      ? {
          _id: permission._id,
          id: permission.id,
          name: permission.name,
          description: permission.description,

          // ✅ FIXED
          permissions: (permission.permissions || []).map((item) => ({
            title_name: item.title_name,
            display_name: item.display_name,
            access: item.access ?? {}, // ← return directly from DB
          })),
        }
      : null,

    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// ─── GET /api/role ──────────────────────────────────────────────────────────
roleRouter.get("/", async (req, res) => {
  try {
    const roles = await Role.find().lean();

    const formatted = await Promise.all(roles.map(formatRoleResponse));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("[Role Get Error]", error);

    res.status(500).json({
      message: "Error fetching roles",
      error: error?.message || String(error),
    });
  }
});

// ─── POST /api/role ─────────────────────────────────────────────────────────
roleRouter.post("/", async (req, res) => {
  try {
    const search =
      req.body && typeof req.body.search === "string"
        ? req.body.search.trim()
        : "";

    const filter = {};

    if (search) {
      filter.name = {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    const roles = await Role.find(filter).lean();

    const formatted = await Promise.all(roles.map(formatRoleResponse));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("[Role Post List Error]", error);

    res.status(500).json({
      message: "Error fetching roles",
      error: error?.message || String(error),
    });
  }
});

// ─── POST /api/role/add ────────────────────────────────────────────────────
roleRouter.post("/add", async (req, res) => {
  try {
    const { name, description, permissions, status, user } = req.body;

    const roleName = typeof name === "string" ? name.trim() : "";

    if (!roleName) {
      return res.status(400).json({
        message: "Role name is required",
      });
    }

    const existingRole = await Role.findOne({
      name: roleName,
    });

    if (existingRole) {
      return res.status(400).json({
        message: "Role already exists",
      });
    }

    // Single permission ObjectId
    const permissionId = await resolvePermissionId(permissions);

    const newRole = new Role({
      name: roleName,
      description: description || "",
      status: ["admin", "user"].includes(status) ? status : "user",

      permissions: permissionId,
    });

    await newRole.save();

    const roleStr =
      typeof user?.role === "string" ? user.role : user?.role?.name || "";

    await new Log({
      name: (user && user.name) || "unknown",
      email: (user && user.mobile) || "",
      role: roleStr,

      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),

      action: `added new role: ${roleName}`,
    }).save();

    const saved = await Role.findById(newRole._id).lean();

    res.status(201).json({
      message: "Role created successfully",
      role: await formatRoleResponse(saved),
    });
  } catch (error) {
    console.error("[Role Add Error]", error);

    if (error?.code === 11000) {
      return res.status(400).json({
        message: "Role already exists (duplicate name)",
      });
    }

    res.status(500).json({
      message: "Error adding role",
      error: error?.message || String(error),
    });
  }
});

// ─── DELETE /api/role/delete ───────────────────────────────────────────────
roleRouter.delete("/delete", async (req, res) => {
  try {
    const { name, user } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      return res.status(400).json({
        message: "name is required",
      });
    }

    const role = await Role.findOneAndDelete({
      name: trimmedName,
    });

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    const roleStr =
      typeof user?.role === "string" ? user.role : user?.role?.name || "";

    await new Log({
      name: (user && user.name) || "unknown",
      email: (user && user.mobile) || "",
      role: roleStr,

      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),

      action: `deleted role: ${trimmedName}`,
    }).save();

    res.status(200).json({
      message: `Role '${trimmedName}' deleted successfully`,
      role: await formatRoleResponse(role),
    });
  } catch (error) {
    console.error("[Role Delete Error]", error);

    res.status(500).json({
      message: "Error deleting role",
      error: error?.message || String(error),
    });
  }
});

// ─── PUT /api/role/edit ────────────────────────────────────────────────────
roleRouter.put("/edit", async (req, res) => {
  try {
    const { name, description, permissions, status, user } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      return res.status(400).json({
        message: "name is required",
      });
    }

    const updateFields = {};

    if (description !== undefined) {
      updateFields.description = description;
    }

    if (status !== undefined && ["admin", "user"].includes(status)) {
      updateFields.status = status;
    }

    if (permissions !== undefined) {
      updateFields.permissions = await resolvePermissionId(permissions);
    }

    const updatedRole = await Role.findOneAndUpdate(
      { name: trimmedName },
      { $set: updateFields },
      { new: true, runValidators: true },
    ).lean();

    if (!updatedRole) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    const roleStr =
      typeof user?.role === "string" ? user.role : user?.role?.name || "";

    await new Log({
      name: (user && user.name) || "unknown",
      email: (user && user.mobile) || "",
      role: roleStr,

      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),

      action: `updated role: ${trimmedName}`,
    }).save();

    res.status(200).json({
      message: "Role updated successfully",
      role: await formatRoleResponse(updatedRole),
    });
  } catch (error) {
    console.error("[Role Update Error]", error);

    res.status(500).json({
      message: "Error updating role",
      error: error?.message || String(error),
    });
  }
});

module.exports = roleRouter;
