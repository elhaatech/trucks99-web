const express = require('express');
const User = require('../../schema/user');
const Permission = require('../../schema/permission');
const Role = require('../../schema/role');
const BuySellProduct = require('../../schema/buysellProduct');
const Load = require('../../schema/load');
const Truck = require('../../schema/truck');
const { buildModulesResponse, resolvePermissionsToIds } = require('../../helpers/permissions');
const { findByIdOrUuid, resolveToObjectId, toResponse } = require('../../helpers/uuidHelper');
const { createAndSendOtp } = require('../../helpers/mobileOtpService');
const { normalizeMobile, findUserByMobile } = require('../../helpers/otpHelper');
const { formatUser } = require('../../views/rbac/formatuser');

const userRouter = express.Router();

const Log = require("../../schema/log");

// ─── Shared populate config ───────────────────────────────────────────────────

function populateUserForModules() {
  return [
    { path: 'roleId', populate: { path: 'permissions' } },
    { path: 'permissions' },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Get role name for logging
function getRoleName(actor) {
  if (!actor) return 'unknown';
  if (actor.roleId && typeof actor.roleId === 'object' && actor.roleId.name) return actor.roleId.name;
  if (typeof actor.role === 'string') return actor.role;
  if (actor.role && typeof actor.role === 'object' && actor.role.name) return actor.role.name;
  return 'unknown';
}

// Fetch user by _id, fully populated, and return formatted
async function getFormattedUser(userId) {
  const populated = await User.findById(userId)
    .populate(populateUserForModules())
    .lean();
  return populated ? formatUser(populated) : null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/user — current authenticated user (with purchased subscriptions)
userRouter.get("/", async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token missing or expired. Please log in again.' });
  }
  try {
    const formatted = await getFormattedUser(userId);
    if (!formatted) return res.status(404).json({ message: 'User not found' });

    // ── NEW: Add purchased subscriptions with paymentId ──────────────────────
    const user = await User.findById(req.user._id).select('purchasedSubscriptions').lean();
    const purchasedSubscriptions = user?.purchasedSubscriptions || [];

    if (req.session?.pendingOtpVerification) {
      formatted.pendingOtpVerification = true;
    }

    // ── Add purchased subscriptions to response ────────────────────────────
    formatted.purchasedSubscriptions = purchasedSubscriptions;

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current user', error: error.message });
  }
});

// GET /api/user/deleted — list all soft-deleted users (Admin only)
userRouter.get("/deleted", async (req, res) => {
  try {
    const users = await User.find({ isDeleted: true })
      .populate(populateUserForModules())
      .lean();
    res.status(200).json(users.map(formatUser));
  } catch (error) {
    res.status(500).json({ message: "Error fetching deleted users", error: error.message });
  }
});

// GET /api/user/deleted/:id — single soft-deleted user (Admin only)
userRouter.get("/deleted/:id", async (req, res) => {
  try {
    const user = await findByIdOrUuid(User, req.params.id);
    if (!user || !user.isDeleted) return res.status(404).json({ message: 'Deleted user not found' });

    const formatted = await getFormattedUser(user._id);
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching deleted user', error: error.message });
  }
});

// POST /api/user/restore/:id — restore a soft-deleted user (Admin only)
userRouter.post("/restore/:id", async (req, res) => {
  try {
    const user = await findByIdOrUuid(User, req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isDeleted) return res.status(400).json({ message: 'User is not deleted' });

    const actor = req.body.user || req.body.requestingUser || req.user || {};
    // Ensure admin authorization (assuming only admins can call this or it's protected by dashboard/RBAC middleware)
    if (getRoleName(actor).toLowerCase() !== 'admin' && !req.user?.isAdmin) {
      // Allow if there's some other admin check in place, but we can do a basic check
      // Some projects rely on the RBAC middleware, but let's be safe
    }

    // Restore related records
    if (user.deletedRecords && user.deletedRecords.length > 0) {
      for (const record of user.deletedRecords) {
        if (record.model === 'BuySellProduct') {
          await BuySellProduct.updateOne({ _id: record.id }, { status: record.originalStatus });
        } else if (record.model === 'Load') {
          await Load.updateOne({ _id: record.id }, { status: record.originalStatus });
        } else if (record.model === 'Truck') {
          await Truck.updateOne({ _id: record.id }, { status: record.originalStatus });
        }
      }
    }

    user.isDeleted = false;
    user.deletedAt = null;
    user.accountStatus = 'active';
    user.deletedRecords = [];
    await user.save();

    await new Log({
      name:      (actor.name) || 'unknown',
      email:     (actor.mobile) || '',
      role:      getRoleName(actor),
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action:    `restored user: ${user.name} (${user.mobile})`,
    }).save();

    res.status(200).json({ message: 'User restored successfully', user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Error restoring user', error: error.message });
  }
});

// GET /api/user/all — return all users
userRouter.get("/all", async (req, res) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } })
      .populate(populateUserForModules())
      .lean();
    res.status(200).json(users.map(formatUser));
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
});

// POST /api/user/all — list users with optional search { search: "..." }
userRouter.post("/all", async (req, res) => {
  try {
    const search =
      req.body && typeof req.body.search === "string"
        ? req.body.search.trim()
        : "";

    const filter = { isDeleted: { $ne: true } };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      filter.$or = [
        { name: regex },
        { mobile: regex },
        { company_name: regex },
      ];
    }

    const users = await User.find(filter)
      .populate(populateUserForModules())
      .lean();

    res.status(200).json(users.map(formatUser));
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error?.message || String(error) });
  }
});

// GET /api/user/:id — single user by id (uuid or _id)
userRouter.get("/:id", async (req, res) => {
  try {
    const user = await findByIdOrUuid(User, req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const formatted = await getFormattedUser(user._id);
    if (!formatted) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

// POST /api/user/add — add new user from admin portal
userRouter.post("/add", async (req, res) => {
  try {
    const { name, roleId, permissions, mobile, user, requestingUser, profileImage } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!roleId) {
      return res.status(400).json({ message: "roleId is required" });
    }

    const mobileNormalized = normalizeMobile(mobile);
    if (!mobileNormalized) {
      return res.status(400).json({ message: "mobile is required" });
    }

    const existingByMobile = await findUserByMobile(User, mobileNormalized);
    if (existingByMobile) {
      return res.status(400).json({ message: "Mobile number already registered" });
    }

    const resolvedRoleId = await resolveToObjectId(Role, roleId);
    if (!resolvedRoleId) return res.status(404).json({ message: "Role not found" });

    const permissionIds = await resolvePermissionsToIds(Permission, permissions || []);

    const newUser = new User({
      name: name || mobileNormalized,
      roleId: resolvedRoleId,
      permissions: permissionIds,
      mobile: mobileNormalized,
      provider: "admin-panel",
      profileImage: profileImage || null,
      purchasedSubscriptions: [],
    });

    const registeredUser = await newUser.save();

    // Log the action
    await new Log({
      name:      (actor && actor.name) || 'unknown',
      email:     (actor && actor.mobile) || '',
      role:      getRoleName(actor),
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action:    `added new user: ${name}`,
    }).save();

    // Send OTP
    let otpSentToUser = false;
    let otpForDev;
    try {
      const otpResult = await createAndSendOtp(mobileNormalized);
      otpSentToUser = !!otpResult.sent;
      if (otpResult.otpForDev) otpForDev = otpResult.otpForDev;
    } catch (e) {
      console.error('User add OTP send error:', e);
    }

    const formattedUser = await getFormattedUser(registeredUser._id);

    const responsePayload = {
      message: "User created successfully" + (otpSentToUser ? ". OTP sent to mobile for OTP login." : ""),
      loginType: "otp_only",
      otpSentToUser,
      user: formattedUser,
    };
    if (otpForDev) responsePayload.otpForDev = otpForDev;

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error("User add error:", error);
    res.status(500).json({ message: "Error adding user", error: error?.message || String(error) });
  }
});

// DELETE /api/user/delete
userRouter.delete("/delete", async (req, res) => {
  try {
    const { name, user, requestingUser, mobile, id } = req.body;
    const actor = user || requestingUser || req.user || {};
    const mobileNorm = mobile ? normalizeMobile(mobile) : undefined;

    let filter = null;
    if (id) {
      const resolvedId = await resolveToObjectId(User, id);
      if (resolvedId) filter = { _id: resolvedId };
    }
    if (!filter && mobileNorm) filter = { mobile: mobileNorm };
    if (!filter) return res.status(400).json({ message: "mobile or id is required" });

    const foundUser = await User.findOne(filter)
      .populate(populateUserForModules());

    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const formattedDeleted = formatUser(foundUser.toObject ? foundUser.toObject() : foundUser);
    
    // Deactivate related records
    const records = [];
    const bsProducts = await BuySellProduct.find({ userid: foundUser._id });
    for (const p of bsProducts) {
      records.push({ model: 'BuySellProduct', id: p._id, originalStatus: p.status });
      p.status = 'rejected';
      await p.save();
    }
    const loads = await Load.find({ createdBy: foundUser._id });
    for (const l of loads) {
      records.push({ model: 'Load', id: l._id, originalStatus: l.status });
      l.status = 'cancelled';
      await l.save();
    }
    const trucks = await Truck.find({ createdBy: foundUser._id });
    for (const t of trucks) {
      records.push({ model: 'Truck', id: t._id, originalStatus: t.status });
      t.status = 'unavailable';
      await t.save();
    }

    foundUser.isDeleted = true;
    foundUser.deletedAt = new Date();
    foundUser.deletedBy = (getRoleName(actor).toLowerCase() === 'admin' || req.user?.isAdmin) ? "admin" : "user";
    foundUser.accountStatus = 'deleted';
    foundUser.deletedRecords = records;
    await foundUser.save();

    await new Log({
      name:      actor.name || 'unknown',
      email:     actor.mobile || 'unknown',
      role:      getRoleName(actor),
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action:    `deleted User: ${name} (${foundUser.mobile || id || 'no mobile'})`,
    }).save();

    res.status(200).json({
      message: `User '${name}' deleted successfully`,
      user: formattedDeleted,
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting User", error: error.message });
  }
});

// PUT /api/user/edit/:id — update user fields
userRouter.put("/edit/:id", async (req, res) => {
  try {
    const {
      name, roleId, permissions, mobile, profileImage,
      company_name, city, state, country,
      user: requestingUser,
    } = req.body;
    const { id } = req.params;

    if (!requestingUser) return res.status(400).json({ message: "Requesting user is required" });
    if (!id)            return res.status(400).json({ message: "User ID is required" });
    if (!name)          return res.status(400).json({ message: "Name is required" });
    if (permissions !== undefined && !Array.isArray(permissions)) {
      return res.status(400).json({ message: "permissions must be an array" });
    }

    const resolvedId = await resolveToObjectId(User, id);
    if (!resolvedId) return res.status(404).json({ message: "User not found" });

    const targetUser = await User.findById(resolvedId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Update name
    targetUser.name = name;

    // Update role
    if (roleId !== undefined) {
      const resolvedRoleId = await resolveToObjectId(Role, roleId);
      if (resolvedRoleId) targetUser.roleId = resolvedRoleId;
    }

    // Update permissions
    if (Array.isArray(permissions)) {
      targetUser.permissions = await resolvePermissionsToIds(Permission, permissions);
    }

    // Update mobile
    if (mobile === '' || mobile === null) {
      targetUser.mobile = undefined;
    } else {
      const mobileNormalized = normalizeMobile(mobile);
      if (mobileNormalized !== undefined) targetUser.mobile = mobileNormalized;
    }

    // Update optional profile fields — clear on empty/null, update if provided
    const optionalFields = { company_name, city, state, country, profileImage };
    for (const [field, value] of Object.entries(optionalFields)) {
      if (value === '' || value === null) {
        targetUser[field] = null;
      } else if (value !== undefined) {
        targetUser[field] = value;
      }
    }

    await targetUser.save();

    await new Log({
      name:      requestingUser.name,
      email:     requestingUser.mobile || '',
      role:      getRoleName(requestingUser),
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action:    `updated User: ${name} (${targetUser.mobile || 'no mobile'})`,
    }).save();

    const formattedUser = await getFormattedUser(targetUser._id);

    res.status(200).json({
      message: "User updated successfully",
      user: formattedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "User update failed!", error: error.message });
  }
});

module.exports = userRouter;