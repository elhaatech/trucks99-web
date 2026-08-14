"use strict";

require("dotenv").config();
const crypto = require("crypto");
const { randomInt } = require("crypto");
const { normalizeMobile } = require("./otpHelper");
const sendSMS = require("./draft4sms/sendSMS");
const redisClient = require("../config/redisClient");
const { ensureRedisConnected } = require("../config/redisClient");

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRATION_MINUTES || 10);
const OTP_EXPIRY_SECONDS = Number(
  process.env.OTP_EXPIRY_SECONDS || OTP_EXPIRY_MINUTES * 60,
);
const OTP_LENGTH = Math.min(
  8,
  Math.max(4, Number(process.env.OTP_LENGTH || 6)),
);
const MAX_VERIFY_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const MAX_RESEND_COUNT = Number(process.env.OTP_MAX_RESEND || 3);
const RESEND_COOLDOWN_SEC = Number(
  process.env.OTP_RESEND_COOLDOWN_SEC ||
    process.env.OTP_RESEND_COOLDOWN_SECONDS ||
    60,
);
const OTP_PEPPER = (
  process.env.OTP_SECRET || "default-otp-secret-change-in-production"
).trim();

function isDevOtpFallbackEnabled() {
  if (String(process.env.DEV_OTP_FALLBACK || "").toLowerCase() === "false") {
    return false;
  }
  if (String(process.env.DEV_OTP_FALLBACK || "").toLowerCase() === "true") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

function isFixedOtpEnabled() {
  return String(process.env.USE_TEMP_OTP || "").toLowerCase() === "true";
}

function hashOtp(plainOtp, mobile) {
  return crypto
    .createHash("sha256")
    .update(`${OTP_PEPPER}:${mobile}:${plainOtp}`)
    .digest("hex");
}

function getFixedTestOtp() {
  const tempOtp = (process.env.TEMP_OTP || "1234").trim();
  return (
    String(tempOtp)
      .replace(/\D/g, "")
      .slice(-OTP_LENGTH)
      .padStart(OTP_LENGTH, "0") ||
    String(10 ** (OTP_LENGTH - 1)).padStart(OTP_LENGTH, "0")
  );
}

function generateOtpCode() {
  if (isFixedOtpEnabled()) {
    return getFixedTestOtp();
  }
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return randomInt(min, max + 1).toString();
}

function buildOtpSmsMessage(otp) {
  const template = (process.env.OTP_SMS_MESSAGE_TEMPLATE || "").trim();
  if (template) {
    return template.replace(/\{otp\}/gi, otp);
  }
  // Must match DLT-approved template used in production (backend.trucks99.in)
  return `${otp} is the OTP for your Trucks99 Login - Team Trucks99`;
}

async function sendOtpViaSms(mobile, plainOtp) {
  return sendSMS(mobile, buildOtpSmsMessage(plainOtp));
}

function otpRedisKey(mobile) {
  return `otp:${mobile}`;
}

async function getOtpRecord(mobile) {
  await ensureRedisConnected();
  const raw = await redisClient.get(otpRedisKey(mobile));
  return raw ? JSON.parse(raw) : null;
}

async function saveOtpRecord(mobile, record, ttlSeconds) {
  await ensureRedisConnected();
  const ttl =
    ttlSeconds > 0
      ? ttlSeconds
      : Math.max(
          1,
          Math.ceil((Number(record.expiresAt) - Date.now()) / 1000),
        );
  await redisClient.set(otpRedisKey(mobile), JSON.stringify(record), {
    EX: ttl > 0 ? ttl : OTP_EXPIRY_SECONDS,
  });
}

async function deleteOtpRecord(mobile) {
  await ensureRedisConnected();
  await redisClient.del(otpRedisKey(mobile));
}

/**
 * Create or replace OTP for mobile and send via Draft4SMS.
 */
async function createAndSendOtp(mobileRaw, { isResend = false } = {}) {
  const mobile = normalizeMobile(mobileRaw);
  if (!mobile) {
    return { ok: false, error: "Mobile number is required." };
  }

  let existing;
  try {
    existing = await getOtpRecord(mobile);
  } catch (err) {
    console.error(
      "Redis error (get):",
      err && err.message ? err.message : err,
    );
    return { ok: false, error: "Internal error (Redis unavailable)." };
  }

  if (isResend) {
    if (!existing) {
      return { ok: false, error: "No OTP found. Request a new OTP first." };
    }
    if (existing.resendCount >= MAX_RESEND_COUNT) {
      return {
        ok: false,
        error: `Maximum resend limit (${MAX_RESEND_COUNT}) reached. Try again later.`,
      };
    }
    const sinceLast =
      Date.now() - Number(existing.updatedAt || existing.createdAt || 0);
    if (sinceLast < RESEND_COOLDOWN_SEC * 1000) {
      const wait = Math.ceil(
        (RESEND_COOLDOWN_SEC * 1000 - sinceLast) / 1000,
      );
      return {
        ok: false,
        error: `Please wait ${wait}s before resending OTP.`,
        retryAfterSeconds: wait,
      };
    }
  } else if (existing) {
    const sinceLast =
      Date.now() - Number(existing.updatedAt || existing.createdAt || 0);
    if (sinceLast < RESEND_COOLDOWN_SEC * 1000) {
      const wait = Math.ceil(
        (RESEND_COOLDOWN_SEC * 1000 - sinceLast) / 1000,
      );
      return {
        ok: false,
        error: `OTP already sent. Wait ${wait}s or use resend.`,
        retryAfterSeconds: wait,
      };
    }
  }

  const plainOtp = generateOtpCode();
  const expiresAt = Date.now() + OTP_EXPIRY_SECONDS * 1000;
  const otpHash = hashOtp(plainOtp, mobile);

  const redisPayload = {
    otpHash,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
    attempts: 0,
    verified: false,
    resendCount: isResend ? (existing?.resendCount || 0) + 1 : 0,
    expiresAt,
  };

  try {
    await saveOtpRecord(mobile, redisPayload, OTP_EXPIRY_SECONDS);
  } catch (err) {
    console.error(
      "Redis error (set):",
      err && err.message ? err.message : err,
    );
    return { ok: false, error: "Internal error (Redis unavailable)." };
  }

  const sms = await sendOtpViaSms(mobile, plainOtp);
  const isDev = isDevOtpFallbackEnabled();

  if (!sms.sent && !isDev) {
    try {
      await deleteOtpRecord(mobile);
    } catch (delErr) {
      console.error(
        "Redis error (del after SMS failure):",
        delErr && delErr.message ? delErr.message : delErr,
      );
    }
    return {
      ok: false,
      error:
        sms.error ||
        "Could not send OTP via SMS. Check SMS provider configuration.",
    };
  }

  const payload = {
    ok: true,
    sent: Boolean(sms.sent),
    message: sms.sent
      ? "OTP sent to your mobile number via SMS."
      : "SMS not sent. Use dev OTP below if enabled.",
  };

  // Dev only: expose the random OTP when SMS failed (never a fixed TEMP_OTP unless USE_TEMP_OTP=true)
  if (isDevOtpFallbackEnabled() && !sms.sent) {
    payload.otpForDev = plainOtp;
  }

  return payload;
}

async function verifyOtpCode(mobileRaw, otpRaw) {
  const mobile = normalizeMobile(mobileRaw);
  const otp = String(otpRaw || "")
    .trim()
    .replace(/\D/g, "")
    .slice(-OTP_LENGTH)
    .padStart(OTP_LENGTH, "0");

  if (!mobile || !otp) {
    return {
      ok: false,
      error: "Mobile number and OTP are required.",
      remainingAttempts: null,
    };
  }

  let record;
  try {
    record = await getOtpRecord(mobile);
  } catch (err) {
    console.error(
      "Redis error (get):",
      err && err.message ? err.message : err,
    );
    return {
      ok: false,
      error: "Internal error (Redis unavailable).",
      remainingAttempts: null,
    };
  }

  if (!record) {
    return {
      ok: false,
      error: "No OTP found. Please request a new one.",
      remainingAttempts: 0,
    };
  }

  if (record.expiresAt && Date.now() > Number(record.expiresAt)) {
    try {
      await deleteOtpRecord(mobile);
    } catch (err) {
      console.error(
        "Redis error (del):",
        err && err.message ? err.message : err,
      );
    }
    return {
      ok: false,
      error: "OTP has expired. Please request a new one.",
      remainingAttempts: 0,
    };
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    try {
      await deleteOtpRecord(mobile);
    } catch (err) {
      console.error(
        "Redis error (del):",
        err && err.message ? err.message : err,
      );
    }
    return {
      ok: false,
      error: "Maximum verification attempts exceeded. Request a new OTP.",
      remainingAttempts: 0,
    };
  }

  const valid = hashOtp(otp, mobile) === record.otpHash;
  if (!valid) {
    record.attempts = (record.attempts || 0) + 1;
    const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - record.attempts);

    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      try {
        await deleteOtpRecord(mobile);
      } catch (err) {
        console.error(
          "Redis error (del after max attempts):",
          err && err.message ? err.message : err,
        );
      }
      return {
        ok: false,
        error: "Maximum verification attempts exceeded. Request a new OTP.",
        remainingAttempts: 0,
      };
    }

    let ttl = OTP_EXPIRY_SECONDS;
    try {
      await ensureRedisConnected();
      ttl = await redisClient.ttl(otpRedisKey(mobile));
    } catch (err) {
      console.error(
        "Redis error (ttl):",
        err && err.message ? err.message : err,
      );
    }

    try {
      await saveOtpRecord(mobile, record, ttl);
    } catch (err) {
      console.error(
        "Redis error (set after failed attempt):",
        err && err.message ? err.message : err,
      );
    }

    return {
      ok: false,
      error: `Incorrect OTP. ${remaining} attempt(s) left.`,
      remainingAttempts: remaining,
    };
  }

  try {
    await deleteOtpRecord(mobile);
  } catch (err) {
    console.error(
      "Redis error (del after success):",
      err && err.message ? err.message : err,
    );
  }

  return { ok: true, remainingAttempts: null };
}

module.exports = {
  createAndSendOtp,
  verifyOtpCode,
  buildOtpSmsMessage,
  sendOtpViaSms,
  normalizeMobile,
  OTP_EXPIRY_SECONDS,
  MAX_VERIFY_ATTEMPTS,
  RESEND_COOLDOWN_SEC,
  MAX_RESEND_COUNT,
};
