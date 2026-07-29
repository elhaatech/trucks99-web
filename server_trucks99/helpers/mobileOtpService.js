'use strict';

require('dotenv').config();
const crypto = require('crypto');
const { randomInt } = require('crypto');
const MobileOtp = require('../schema/mobileOtp');
const { normalizeMobile } = require('./otpHelper');
const sendSMS = require('./twilio/sendSMS');

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRATION_MINUTES || 5);
const MAX_VERIFY_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const MAX_RESEND_COUNT = Number(process.env.OTP_MAX_RESEND || 3);
const RESEND_COOLDOWN_SEC = Number(process.env.OTP_RESEND_COOLDOWN_SEC || 60);
const OTP_PEPPER = (process.env.OTP_SECRET || 'default-otp-secret-change-in-production').trim();

function isDevOtpFallbackEnabled() {
  if (String(process.env.DEV_OTP_FALLBACK || '').toLowerCase() === 'false') {
    return false;
  }
  if (String(process.env.DEV_OTP_FALLBACK || '').toLowerCase() === 'true') {
    return true;
  }
  return process.env.NODE_ENV !== 'production';
}

function hashOtp(plainOtp, mobile) {
  return crypto
    .createHash('sha256')
    .update(`${OTP_PEPPER}:${mobile}:${plainOtp}`)
    .digest('hex');
}

function getDevDefaultOtp() {
  const tempOtp = (process.env.TEMP_OTP || '123456').trim();
  return String(tempOtp).replace(/\D/g, '').slice(-6).padStart(6, '0') || '123456';
}

function generateOtpCode() {
  if (isDevOtpFallbackEnabled()) {
    return getDevDefaultOtp();
  }
  return randomInt(100000, 999999).toString();
}

function buildOtpSmsMessage(otp) {
  return (
    `Your iTruck verification code is: ${otp}. ` +
    `This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.`
  );
}

async function sendOtpViaSms(mobile, plainOtp) {
  return sendSMS(mobile, buildOtpSmsMessage(plainOtp));
}

/**
 * Create or replace OTP for mobile and send via Twilio SMS.
 */
async function createAndSendOtp(mobileRaw, { isResend = false } = {}) {
  const mobile = normalizeMobile(mobileRaw);
  if (!mobile) {
    return { ok: false, error: 'Mobile number is required.' };
  }

  const existing = await MobileOtp.findOne({ mobile }).lean();

  if (isResend) {
    if (!existing) {
      return { ok: false, error: 'No OTP found. Request a new OTP first.' };
    }
    if (existing.resendCount >= MAX_RESEND_COUNT) {
      return {
        ok: false,
        error: `Maximum resend limit (${MAX_RESEND_COUNT}) reached. Try again later.`,
      };
    }
    const sinceLast = Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime();
    if (sinceLast < RESEND_COOLDOWN_SEC * 1000) {
      const wait = Math.ceil((RESEND_COOLDOWN_SEC * 1000 - sinceLast) / 1000);
      return { ok: false, error: `Please wait ${wait}s before resending OTP.` };
    }
  } else if (existing) {
    const sinceLast = Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime();
    if (sinceLast < RESEND_COOLDOWN_SEC * 1000) {
      const wait = Math.ceil((RESEND_COOLDOWN_SEC * 1000 - sinceLast) / 1000);
      return { ok: false, error: `OTP already sent. Wait ${wait}s or use resend.` };
    }
  }

  const plainOtp = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const otpHash = hashOtp(plainOtp, mobile);

  if (isResend) {
    await MobileOtp.findOneAndUpdate(
      { mobile },
      {
        $set: { otpHash, expiresAt, attempts: 0, verified: false },
        $inc: { resendCount: 1 },
      },
    );
  } else {
    await MobileOtp.findOneAndUpdate(
      { mobile },
      {
        $set: {
          otpHash,
          expiresAt,
          attempts: 0,
          verified: false,
          resendCount: 0,
        },
      },
      { upsert: true },
    );
  }

  const sms = await sendOtpViaSms(mobile, plainOtp);
  const isDev = isDevOtpFallbackEnabled();

  if (!sms.sent && !isDev) {
    return {
      ok: false,
      error: sms.error || 'Could not send OTP via SMS. Check Twilio configuration.',
    };
  }

  const payload = {
    ok: true,
    sent: Boolean(sms.sent),
    message: sms.sent
      ? 'OTP sent to your mobile number via SMS.'
      : 'SMS not sent (Twilio). Use dev OTP below if enabled.',
  };

  if (isDev) {
    payload.otpForDev = plainOtp;
  }

  return payload;
}

async function verifyOtpCode(mobileRaw, otpRaw) {
  const mobile = normalizeMobile(mobileRaw);
  const otp = String(otpRaw || '')
    .trim()
    .replace(/\D/g, '')
    .slice(-6)
    .padStart(6, '0');

  if (!mobile || !otp) {
    return { ok: false, error: 'Mobile number and OTP are required.' };
  }

  const isDev = isDevOtpFallbackEnabled();
  const tempOtp = getDevDefaultOtp();
  const expectedDev = tempOtp;

  if (isDev && (otp === expectedDev || otp === '123456')) {
    await MobileOtp.deleteOne({ mobile });
    return { ok: true, devBypass: true };
  }

  const record = await MobileOtp.findOne({ mobile });
  if (!record) {
    return { ok: false, error: 'No OTP found. Please request a new one.' };
  }

  if (new Date() > new Date(record.expiresAt)) {
    await MobileOtp.deleteOne({ _id: record._id });
    return { ok: false, error: 'OTP has expired. Please request a new one.' };
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    await MobileOtp.deleteOne({ _id: record._id });
    return {
      ok: false,
      error: 'Maximum verification attempts exceeded. Request a new OTP.',
    };
  }

  const valid = hashOtp(otp, mobile) === record.otpHash;
  if (!valid) {
    record.attempts += 1;
    await record.save();
    const remaining = MAX_VERIFY_ATTEMPTS - record.attempts;
    return {
      ok: false,
      error: `Incorrect OTP.${remaining > 0 ? ` ${remaining} attempt(s) left.` : ''}`,
    };
  }

  record.verified = true;
  await record.save();
  await MobileOtp.deleteOne({ _id: record._id });

  return { ok: true };
}

module.exports = {
  createAndSendOtp,
  verifyOtpCode,
  buildOtpSmsMessage,
  sendOtpViaSms,
  normalizeMobile,
};
