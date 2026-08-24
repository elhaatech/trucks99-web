require('dotenv').config();
const cryptojs = require('crypto-js');
const { randomInt } = require('crypto');
const Otp = require('../schema/otp');

const OTP_SECRET = (process.env.OTP_SECRET || 'default-otp-secret-change-in-production').trim();
const OTP_EXPIRATION_MINUTES = Number(process.env.OTP_EXPIRATION_MINUTES) || 5;

/**
 * Return common Indian mobile string variants for DB lookup.
 * @param {string} m
 * @returns {string[]}
 */
function indianMobileVariants(m) {
  const digits = String(m || '').replace(/\D/g, '');
  let ten = '';
  if (digits.length === 10) ten = digits;
  else if (digits.length === 11 && digits.startsWith('0')) ten = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith('91')) ten = digits.slice(2);
  else if (digits.length > 10) ten = digits.slice(-10);
  if (!/^\d{10}$/.test(ten)) return [];
  return [ten, `+91${ten}`, `91${ten}`, `0${ten}`];
}

/**
 * Normalize mobile to E.164 (e.g. 9876543210 -> +919876543210).
 * @param {string} m - Raw mobile input
 * @returns {string}
 */
function normalizeMobile(m) {
  const variants = indianMobileVariants(m);
  if (!variants.length) return '';
  return `+91${variants[0]}`;
}

/**
 * Find a user whose mobile is stored as 10-digit, +91, 91, or 0-prefixed.
 */
async function findUserByMobile(User, mobileRaw, query = {}) {
  const variants = indianMobileVariants(mobileRaw);
  if (!variants.length) return null;
  return User.findOne({ mobile: { $in: variants }, ...query });
}

/**
 * Create OTP for a user (encrypted, stored in DB). Returns plain OTP string for sending.
 * @param {string|ObjectId} userId - User _id
 * @param {string} channel - 'sms' | 'email'
 * @returns {Promise<string>} OTP code
 */
async function createOtpForUser(userId, channel = 'sms') {
  const existing = await Otp.findOne({ userId });
  if (existing) await Otp.findByIdAndDelete(existing._id);

  const otpLength = Number(process.env.OTP_LENGTH || 4);
  const otpNum = randomInt(10 ** (otpLength - 1), 10 ** otpLength).toString();
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
  return (
    normalized === original ||
    (normalized.length === 5 && '0' + normalized === original)
  );
}

module.exports = {
  indianMobileVariants,
  normalizeMobile,
  findUserByMobile,
  createOtpForUser,
  verifyOtpWithSecret,
};
