"use strict";

const User = require("../schema/user");
const Role = require("../schema/role");
const { findUserByMobile } = require("./otpHelper");
const { resolveToObjectId } = require("./uuidHelper");

const PREFERRED_MARKETPLACE_ROLE_NAMES = [
  "Buy/Sell",
  "Buy/sell",
  "Buy Sell",
  "Buy Sell User",
];

/**
 * Same Buy/Sell role the marketplace register page already assigns.
 */
async function findDefaultMarketplaceRoleId() {
  for (const name of PREFERRED_MARKETPLACE_ROLE_NAMES) {
    const role = await Role.findOne({ name }).select("_id").lean();
    if (role) return role._id;
  }
  const role = await Role.findOne({
    name: { $regex: /^buy\s*[/\-]?\s*sell(\s+user)?$/i },
  })
    .select("_id name")
    .lean();
  if (role && !/super\s*admin/i.test(String(role.name || ""))) {
    return role._id;
  }
  return null;
}

function optionalString(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

/**
 * Find an existing user by mobile, or create one using the current User schema
 * and the same fields as POST /api/signup.
 *
 * Duplicate-safe: a second request for the same new mobile finds the first user.
 */
async function ensureUserForMobileAuth(normalizedMobile, profile = {}) {
  const existing = await findUserByMobile(User, normalizedMobile);
  if (existing) {
    return { user: existing, isNewUser: false };
  }

  const {
    name,
    email,
    roleId,
    company_name,
    city,
    state,
    country,
    profileImage,
    termsAccepted,
  } = profile || {};

  const normalizedEmail = optionalString(email)?.toLowerCase();
  if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const err = new Error("Enter a valid email address.");
    err.status = 400;
    throw err;
  }

  let resolvedRoleId = null;
  if (roleId) {
    resolvedRoleId = await resolveToObjectId(Role, roleId);
    if (!resolvedRoleId) {
      const err = new Error("Invalid roleId");
      err.status = 400;
      throw err;
    }
  } else {
    resolvedRoleId = await findDefaultMarketplaceRoleId();
  }

  const payload = {
    name: optionalString(name) || normalizedMobile,
    roleId: resolvedRoleId,
    mobile: normalizedMobile,
    company_name: optionalString(company_name),
    city: optionalString(city),
    state: optionalString(state),
    country: optionalString(country),
    email: normalizedEmail || `m_${normalizedMobile}@otp.user`,
    profileImage: optionalString(profileImage),
    termsAccepted: termsAccepted === true,
  };

  try {
    const user = await new User(payload).save();
    return { user, isNewUser: true };
  } catch (err) {
    const raced = await findUserByMobile(User, normalizedMobile);
    if (raced) {
      return { user: raced, isNewUser: false };
    }
    throw err;
  }
}

module.exports = {
  ensureUserForMobileAuth,
  findDefaultMarketplaceRoleId,
};
