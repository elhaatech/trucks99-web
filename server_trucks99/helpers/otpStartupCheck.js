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
    console.error("[OTP] Install/start Redis and set REDIS_URL in .env");
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
      "[OTP] WARNING: OTP login will fail in production until the issues above are fixed.",
    );
  }

  return { ok: issues.length === 0, issues };
}

module.exports = { checkOtpDependencies };
