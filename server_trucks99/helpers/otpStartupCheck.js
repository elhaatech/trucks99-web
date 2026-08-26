"use strict";

const sendSMS = require("./draft4sms/sendSMS");
const { ensureRedisConnected } = require("../config/redisClient");

async function checkOtpDependencies() {
  const isProduction = process.env.NODE_ENV === "production";
  const issues = [];

  try {
    await ensureRedisConnected();
    console.log("[OTP] Redis: connected");
  } catch (err) {
    const msg = `Redis unavailable (${err.message || err})`;
    issues.push(msg);
    console.error(`[OTP] ${msg}`);
    console.error("[OTP] Login OTP will use MongoDB fallback until Redis is available.");
    console.error("[OTP] Optional: install/start Redis and set REDIS_URL in .env");
  }

  if (sendSMS.isDraft4SmsConfigured()) {
    console.log("[OTP] Draft4SMS: API key and sender ID configured");
  } else {
    const msg = "Draft4SMS not configured (set DRAFT4SMS_API_KEY and DRAFT4SMS_SENDER_ID)";
    issues.push(msg);
    console.error(`[OTP] ${msg}`);
  }

  if (isProduction && issues.length) {
    console.error(
      "[OTP] WARNING: Redis and/or SMS config issues above. OTP storage can use MongoDB if Redis is down; SMS still requires Draft4SMS.",
    );
  }

  return { ok: issues.length === 0, issues };
}

module.exports = { checkOtpDependencies };
