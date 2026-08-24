"use strict";

const express = require("express");
const User = require("../schema/user");
const { signToken } = require("../helpers/jwt");
const { verifyPassword } = require("../helpers/password");
const { isAdminUser } = require("../helpers/dashboardAccess");
const { formatUser } = require("./rbac/formatuser");

const loginRouter = express.Router();

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function invalidCredentials(res) {
  return res.status(401).json({ message: "Invalid email or password." });
}

/**
 * POST /api/login
 * Admin email + password login. Marketplace/user OTP login is unchanged
 * (POST /api/otp/verify and POST /api/auth/verify-otp).
 */
loginRouter.post("/", async (req, res) => {
  try {
    const email = String(req.body?.email || req.body?.username || "").trim();
    const password = req.body?.password;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({
      email: { $regex: `^${escapeRegex(email)}$`, $options: "i" },
    })
      .select("+hash +salt")
      .populate({ path: "roleId", populate: { path: "permissions" } })
      .populate("permissions");

    if (!user || !verifyPassword(password, user.salt, user.hash)) {
      return invalidCredentials(res);
    }

    if (!isAdminUser(user)) {
      return invalidCredentials(res);
    }

    if (String(user.status || "active").toLowerCase() === "inactive") {
      return res.status(403).json({ message: "Account is inactive." });
    }

    const token = signToken(user);
    const raw = user.toObject ? user.toObject({ virtuals: false }) : user;
    delete raw.hash;
    delete raw.salt;
    const safeUser = formatUser(raw);
    const payload = {
      message: "Login successful.",
      token,
      user: safeUser,
    };

    // JWT is the Admin API credential. Session cookies are best-effort so a
    // production session-store failure cannot block a valid login.
    req.logIn(user, (err) => {
      if (err) {
        console.error("[login] session not created; JWT still issued:", err.message || err);
      }
      return res.status(200).json(payload);
    });
  } catch (err) {
    console.error("[login] admin email/password error:", err);
    return res.status(500).json({ message: "Login failed." });
  }
});

module.exports = loginRouter;
