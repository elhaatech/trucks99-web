require('dotenv').config();
const cryptojs = require('crypto-js');
const { randomInt } = require('crypto');
const Otp = require('../schema/otp');

const OTP_SECRET = (process.env.OTP_SECRET || 'default-otp-secret-change-in-production').trim();
const OTP_EXPIRATION_MINUTES = Number(process.env.OTP_EXPIRATION_MINUTES) || 5;

/**
 * Normalize mobile to E.164 (e.g. 9876543210 -> +919876543210).
 * @param {string} m - Raw mobile input
 * @returns {string}
 */
function normalizeMobile(m) {
  const t = (m && String(m).trim().replace(/\s/g, '')) || '';
  if (!t) return '';
  return /^\d{10}$/.test(t) ? `+91${t}` : t.startsWith('+') ? t : `+91${t}`;
}

/**
 * Create OTP for a user (encrypted, stored in DB). Returns plain OTP string for sending.
 * Set USE_TEMP_OTP=true to use TEMP_OTP for manual testing only.
 * @param {string|ObjectId} userId - User _id
 * @param {string} channel - 'sms' | 'email'
 * @returns {Promise<string>} OTP code
 */
async function createOtpForUser(userId, channel = 'sms') {
  const existing = await Otp.findOne({ userId });
  if (existing) await Otp.findByIdAndDelete(existing._id);

  const useFixedOtp = String(process.env.USE_TEMP_OTP || '').toLowerCase() === 'true';
  const tempOtp = (process.env.TEMP_OTP || '1234').trim();
  const otpLength = Number(process.env.OTP_LENGTH || 4);
  const otpNum = useFixedOtp && tempOtp
    ? String(tempOtp).replace(/\D/g, '').slice(-otpLength).padStart(otpLength, '0')
    : randomInt(10 ** (otpLength - 1), 10 ** otpLength - 1).toString();
  const encryptedOtp = cryptojs.AES.encrypt(otpNum, OTP_SECRET).toString();
  const expiryDate = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

  await Otp.create({ userId, otp: encryptedOtp, channel, expiryDate });
  return otpNum.padStart(otpLength, '0');
}

/**
 * Verify plain OTP against encrypted stored OTP.
 */
function verifyOtpWithSecret(plainOtp, encryptedOtp) {
  const bytes = cryptojs.AES.decrypt(encryptedOtp, OTP_SECRET);
  const original = bytes.toString(cryptojs.enc.Utf8);
  const normalized = String(plainOtp).trim();
  const useFixedOtp = String(process.env.USE_TEMP_OTP || '').toLowerCase() === 'true';
  const defaultOtp = (process.env.TEMP_OTP || '1234').trim();
  return (
    normalized === original ||
    (normalized.length === 5 && '0' + normalized === original) ||
    (useFixedOtp && normalized === defaultOtp)
  );
}

module.exports = {
  normalizeMobile,
  createOtpForUser,
  verifyOtpWithSecret,
};
