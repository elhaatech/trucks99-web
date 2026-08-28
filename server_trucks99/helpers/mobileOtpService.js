"use strict";

require("dotenv").config();
const crypto = require("crypto");
const { randomInt } = require("crypto");
const { normalizeMobile } = require("./otpHelper");
const sendSMS = require("./draft4sms/sendSMS");
const redisClient = require("../config/redisClient");
const { ensureRedisConnected } = require("../config/redisClient");
const MobileOtp = require("../schema/mobileOtp");

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRATION_MINUTES || 10);
const OTP_EXPIRY_SECONDS = Number(
  process.env.OTP_EXPIRY_SECONDS || OTP_EXPIRY_MINUTES * 60,
);
const OTP_LENGTH = Math.min(
  8,
  Math.max(4, Number(process.env.OTP_LENGTH || 4)),
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
const DEFAULT_OTP_MOBILE = normalizeMobile("9150723962");
const DEFAULT_OTP = "1234";

function isDevOtpFallbackEnabled() {
  return String(process.env.DEV_OTP_FALLBACK || "").toLowerCase() === "true";
}

function hashOtp(plainOtp, mobile) {
  return crypto
    .createHash("sha256")
    .update(`${OTP_PEPPER}:${mobile}:${plainOtp}`)
    .digest("hex");
}

function generateOtpCode() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return randomInt(min, max + 1).toString();
}

function fillOtpPlaceholders(template, otp) {
  return String(template)
    .replace(/\{otp\}/gi, otp)
    .replace(/\{#var#\}/gi, otp)
    .replace(/\{#number#\}/gi, otp);
}

function buildOtpSmsMessage(otp) {
  const template = (process.env.OTP_SMS_MESSAGE_TEMPLATE || "").trim();
  if (template) {
    return fillOtpPlaceholders(template, otp);
  }
  // Must match the active Draft4SMS DLT template (template id 1277178714236822028)
  return `Hi, Your TRUCKS99 verification code is ${otp}. Please don't share this code to anyone. Thanks`;
}

async function sendOtpViaSms(mobile, plainOtp) {
  return sendSMS(mobile, buildOtpSmsMessage(plainOtp));
}

function otpRedisKey(mobile) {
  return `otp:${mobile}`;
}

function mongoDocToRecord(doc) {
  if (!doc) return null;
  return {
    otpHash: doc.otpHash,
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now(),
    attempts: doc.attempts || 0,
    verified: Boolean(doc.verified),
    resendCount: doc.resendCount || 0,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).getTime() : 0,
  };
}

async function getOtpRecordMongo(mobile) {
  const doc = await MobileOtp.findOne({ mobile }).exec();
  return mongoDocToRecord(doc);
}

async function saveOtpRecordMongo(mobile, record) {
  await MobileOtp.findOneAndUpdate(
    { mobile },
    {
      otpHash: record.otpHash,
      expiresAt: new Date(Number(record.expiresAt) || Date.now() + OTP_EXPIRY_SECONDS * 1000),
      attempts: record.attempts || 0,
      resendCount: record.resendCount || 0,
      verified: Boolean(record.verified),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();
}

async function getOtpRecord(mobile) {
  try {
    await ensureRedisConnected();
    const raw = await redisClient.get(otpRedisKey(mobile));
    if (raw) return JSON.parse(raw);
  } catch (err) {
    const msg = err && err.message ? err.message : err;
    if (!String(msg).startsWith("Redis unavailable")) {
      console.error("Redis error (get), using MongoDB fallback:", msg);
    }
  }
  return getOtpRecordMongo(mobile);
}

async function saveOtpRecord(mobile, record, ttlSeconds) {
  const ttl =
    ttlSeconds > 0
      ? ttlSeconds
      : Math.max(
          1,
          Math.ceil((Number(record.expiresAt) - Date.now()) / 1000),
        );
  try {
    await ensureRedisConnected();
    await redisClient.set(otpRedisKey(mobile), JSON.stringify(record), {
      EX: ttl > 0 ? ttl : OTP_EXPIRY_SECONDS,
    });
    await MobileOtp.deleteOne({ mobile }).catch(() => {});
    return "redis";
  } catch (err) {
    const msg = err && err.message ? err.message : err;
    if (!String(msg).startsWith("Redis unavailable")) {
      console.error("Redis error (set), using MongoDB fallback:", msg);
    }
  }
  await saveOtpRecordMongo(mobile, record);
  return "mongodb";
}

async function deleteOtpRecord(mobile) {
  try {
    await ensureRedisConnected();
    await redisClient.del(otpRedisKey(mobile));
  } catch (err) {
    const msg = err && err.message ? err.message : err;
    if (!String(msg).startsWith("Redis unavailable")) {
      console.error("Redis error (del):", msg);
    }
  }
  await MobileOtp.deleteOne({ mobile }).catch(() => {});
}

/**
 * Create or replace OTP for mobile and send via Draft4SMS.
 */
async function createAndSendOtp(
  mobileRaw,
  { isResend = false, useDefaultOtp = false } = {},
) {
  const mobile = normalizeMobile(mobileRaw);
  if (!mobile) {
    return { ok: false, error: "Mobile number is required." };
  }

  let existing;
  try {
    existing = await getOtpRecord(mobile);
  } catch (err) {
    console.error(
      "OTP store error (get):",
      err && err.message ? err.message : err,
    );
    return { ok: false, error: "Internal error (OTP store unavailable)." };
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

  const usesDefaultOtp = useDefaultOtp && mobile === DEFAULT_OTP_MOBILE;
  const plainOtp = usesDefaultOtp ? DEFAULT_OTP : generateOtpCode();
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

  let storedIn = "mongodb";
  try {
    storedIn = await saveOtpRecord(mobile, redisPayload, OTP_EXPIRY_SECONDS);
  } catch (err) {
    console.error(
      "OTP store error (set):",
      err && err.message ? err.message : err,
    );
    return { ok: false, error: "Internal error (OTP store unavailable)." };
  }

  if (usesDefaultOtp) {
    return {
      ok: true,
      sent: false,
      message: "OTP generated successfully.",
    };
  }

  console.log(`[OTP] stored via ${storedIn} for ${mobile}; calling Draft4SMS`);

  let sms;
  try {
    sms = await sendOtpViaSms(mobile, plainOtp);
  } catch (err) {
    sms = {
      sent: false,
      error: err && err.message ? err.message : "SMS send failed",
    };
  }

  console.log(
    `[OTP] Draft4SMS sent=${Boolean(sms.sent)} error=${sms.error || "none"}`,
  );

  if (!sms.sent) {
    try {
      await deleteOtpRecord(mobile);
    } catch (delErr) {
      console.error(
        "Redis error (del after SMS failure):",
        delErr && delErr.message ? delErr.message : delErr,
      );
    }

    if (isDevOtpFallbackEnabled()) {
      return {
        ok: true,
        sent: false,
        message: "SMS not sent. Request a new OTP.",
        smsError: sms.error,
        otpForDev: plainOtp,
      };
    }

    return {
      ok: false,
      error: "Could not send OTP via SMS. Try again later.",
      smsError: sms.error,
    };
  }

  const payload = {
    ok: true,
    sent: true,
    message: "OTP sent to your mobile number via SMS.",
  };
  if (isDevOtpFallbackEnabled()) {
    payload.otpForDev = plainOtp;
  }
  return payload;
}

async function verifyOtpCode(mobileRaw, otpRaw) {
  const mobile = normalizeMobile(mobileRaw);
  const otp =
    mobile === DEFAULT_OTP_MOBILE
      ? String(otpRaw || "").trim().replace(/\D/g, "")
      : String(otpRaw || "")
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
      "OTP store error (get):",
      err && err.message ? err.message : err,
    );
    return {
      ok: false,
      error: "Internal error (OTP store unavailable).",
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
