"use strict";

const crypto = require("crypto");

/**
 * Matches passport-local-mongoose defaults (already a project dependency):
 * saltlen 32, iterations 25000, keylen 512, digest sha256, encoding hex.
 */
const SALT_LEN = 32;
const ITERATIONS = 25000;
const KEYLEN = 512;
const DIGEST = "sha256";

function hashPassword(plainPassword) {
  const password = String(plainPassword ?? "");
  if (!password) {
    throw new Error("Password is required");
  }
  const salt = crypto.randomBytes(SALT_LEN).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST)
    .toString("hex");
  return { salt, hash };
}

function verifyPassword(plainPassword, salt, hash) {
  if (!plainPassword || !salt || !hash) return false;
  const computed = crypto
    .pbkdf2Sync(String(plainPassword), String(salt), ITERATIONS, KEYLEN, DIGEST)
    .toString("hex");
  try {
    const a = Buffer.from(String(hash), "hex");
    const b = Buffer.from(computed, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
