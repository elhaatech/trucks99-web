'use strict';

const express = require('express');
const User = require('../schema/user');
const { signToken } = require('../helpers/jwt');
const { transformRolePermissions } = require('../helpers/rolePermissions');
const { normalizeMobile, findUserByMobile } = require('../helpers/otpHelper');
const {
  createAndSendOtp,
  verifyOtpCode,
} = require('../helpers/mobileOtpService');

const authRouter = express.Router();

function loginUser(req, res, user) {
  const token = signToken(user);
  req.logIn(user, (err) => {
    if (err) {
      return res.status(500).json({ message: 'Login failed.' });
    }
    const rolePayload = user.roleId
      ? transformRolePermissions(user.roleId)
      : { rolename: '', permissions: {} };
    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        roleId: user.roleId && (user.roleId._id || user.roleId),
        role: rolePayload,
        mobile: user.mobile || null,
      },
    });
  });
}

// POST /api/auth/send-otp — body: { mobile }
authRouter.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body || {};
    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile) {
      return res.status(400).json({ message: 'Mobile number is required.' });
    }

    const user = await findUserByMobile(User, normalizedMobile);
    if (!user) {
      return res.status(404).json({
        message: 'No account found for this mobile number. Please register first.',
      });
    }

    const result = await createAndSendOtp(normalizedMobile, { isResend: false });
    if (!result.ok) {
      return res.status(result.error?.includes('Wait') ? 429 : 503).json({
        message: result.error,
        otpSentViaSms: false,
        ...(result.smsError ? { smsError: result.smsError } : {}),
      });
    }

    return res.status(200).json({
      message: result.message,
      otpSentViaSms: Boolean(result.sent),
      ...(String(process.env.DEV_OTP_FALLBACK || '').toLowerCase() === 'true' && result.otpForDev
        ? { otpForDev: result.otpForDev }
        : {}),
      ...(result.smsError ? { smsError: result.smsError } : {}),
    });
  } catch (err) {
    console.error('[auth] send-otp error:', err);
    if (err.status === 400) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to send OTP.' });
  }
});

// POST /api/auth/resend-otp — body: { mobile }
authRouter.post('/resend-otp', async (req, res) => {
  try {
    const { mobile } = req.body || {};
    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile) {
      return res.status(400).json({ message: 'Mobile number is required.' });
    }

    const user = await findUserByMobile(User, normalizedMobile);
    if (!user) {
      return res.status(404).json({
        message: 'No account found for this mobile number. Please register first.',
      });
    }

    const result = await createAndSendOtp(normalizedMobile, { isResend: true });
    if (!result.ok) {
      return res.status(result.error?.includes('wait') ? 429 : 400).json({
        message: result.error,
        otpSentViaSms: false,
        ...(result.smsError ? { smsError: result.smsError } : {}),
      });
    }

    return res.status(200).json({
      message: result.message || 'OTP resent via SMS.',
      otpSentViaSms: Boolean(result.sent),
      ...(String(process.env.DEV_OTP_FALLBACK || '').toLowerCase() === 'true' && result.otpForDev
        ? { otpForDev: result.otpForDev }
        : {}),
      ...(result.smsError ? { smsError: result.smsError } : {}),
    });
  } catch (err) {
    console.error('[auth] resend-otp error:', err);
    return res.status(500).json({ message: 'Failed to resend OTP.' });
  }
});

// POST /api/auth/verify-otp — body: { mobile, otp }
authRouter.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, otp } = req.body || {};
    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile || !otp) {
      return res.status(400).json({ message: 'Mobile number and OTP are required.' });
    }

    const user = await findUserByMobile(User, normalizedMobile);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    await user.populate({ path: 'roleId', populate: { path: 'permissions' } });
    await user.populate('permissions');

    const verification = await verifyOtpCode(normalizedMobile, otp);
    if (!verification.ok) {
      return res.status(401).json({
        message: verification.error,
        ...(verification.remainingAttempts !== null &&
        verification.remainingAttempts !== undefined
          ? { remainingAttempts: verification.remainingAttempts }
          : {}),
      });
    }

    return loginUser(req, res, user);
  } catch (err) {
    console.error('[auth] verify-otp error:', err);
    return res.status(500).json({ message: 'Verification failed.' });
  }
});

module.exports = authRouter;
