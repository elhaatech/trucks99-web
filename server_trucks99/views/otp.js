require('dotenv').config();

const express = require('express');
const User = require('../schema/user');
const Otp = require('../schema/otp');
const { createOtpForUser, verifyOtpWithSecret, normalizeMobile, findUserByMobile } = require('../helpers/otpHelper');
const { ensureUserForMobileAuth } = require('../helpers/ensureOtpUser');
const {
  createAndSendOtp,
  verifyOtpCode,
  sendOtpViaSms,
} = require('../helpers/mobileOtpService');
const { signToken } = require('../helpers/jwt');
const { transformRolePermissions } = require('../helpers/rolePermissions');

const otpRouter = express.Router();

// GET /api/otp/health — deployment check (Redis + SMS config, no secrets)
otpRouter.get('/health', async (_req, res) => {
  const sendSMS = require('../helpers/draft4sms/sendSMS');
  const { ensureRedisConnected } = require('../config/redisClient');

  let redisOk = false;
  let redisError;
  try {
    await ensureRedisConnected();
    redisOk = true;
  } catch (err) {
    redisError = err.message || String(err);
  }

  const smsConfigured = sendSMS.isDraft4SmsConfigured();

  // OTP can still be stored in MongoDB when Redis is down
  const otpReady = smsConfigured;
  return res.status(otpReady ? 200 : 503).json({
    ok: otpReady,
    redis: redisOk ? 'connected' : 'unavailable',
    otpStorage: redisOk ? 'redis' : 'mongodb',
    ...(redisError ? { redisError } : {}),
    draft4sms: smsConfigured ? 'configured' : 'missing_api_key_or_sender',
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});

function loginResponse(req, res, user) {
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

function allowDevOtpInResponse() {
  return String(process.env.DEV_OTP_FALLBACK || "").toLowerCase() === "true";
}

function otpDevFields(result) {
  if (!allowDevOtpInResponse() || !result || !result.otpForDev) return {};
  return { otpForDev: result.otpForDev };
}

function otpProfileFromBody(body = {}) {
  return {
    name: body.name,
    email: body.email,
    roleId: body.roleId,
    company_name: body.company_name,
    city: body.city,
    state: body.state,
    country: body.country,
    profileImage: body.profileImage,
    termsAccepted: body.termsAccepted,
  };
}

// POST /api/otp/send — body: { mobile }. Optional profile fields used only for new users.
otpRouter.post('/send', async (req, res) => {
  try {
    const { mobile } = req.body || {};
    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile) {
      return res.status(400).json({ message: 'Mobile number is required.' });
    }

    const { user, isNewUser } = await ensureUserForMobileAuth(
      normalizedMobile,
      otpProfileFromBody(req.body),
    );

    console.log(`[OTP] sending SMS to ${normalizedMobile} (${user.name || 'user found'}, isNewUser=${isNewUser})`);
    const result = await createAndSendOtp(normalizedMobile);
    console.log(`[OTP] send result ok=${result.ok} sent=${Boolean(result.sent)} error=${result.error || result.smsError || 'none'}`);
    if (!result.ok) {
      const status = result.retryAfterSeconds ? 429 : 503;
      return res.status(status).json({
        message: result.error || 'Could not send OTP.',
        otpSentViaSms: false,
        isNewUser,
        ...(result.smsError ? { smsError: result.smsError } : {}),
        ...(result.retryAfterSeconds ? { retryAfterSeconds: result.retryAfterSeconds } : {}),
      });
    }

    return res.status(200).json({
      message: result.message || 'OTP sent to your mobile number.',
      otpSentViaSms: Boolean(result.sent),
      isNewUser,
      ...otpDevFields(result),
      ...(result.smsError ? { smsError: result.smsError } : {}),
    });
  } catch (err) {
    console.error('OTP send error:', err);
    if (err.status === 400) {
      return res.status(400).json({ message: err.message });
    }
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      message: 'Failed to send OTP.',
      otpSentViaSms: false,
      ...(isDev ? { error: err.message } : {}),
    });
  }
});

// POST /api/otp/resend — body: { mobile }
otpRouter.post('/resend', async (req, res) => {
  try {
    const { mobile } = req.body;
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
      const status = result.retryAfterSeconds ? 429 : 400;
      return res.status(status).json({
        message: result.error || 'Could not resend OTP.',
        otpSentViaSms: false,
        ...(result.retryAfterSeconds ? { retryAfterSeconds: result.retryAfterSeconds } : {}),
        ...(result.smsError ? { smsError: result.smsError } : {}),
      });
    }

    return res.status(200).json({
      message: result.message || 'OTP resent to your mobile number.',
      otpSentViaSms: Boolean(result.sent),
      ...otpDevFields(result),
      ...(result.smsError ? { smsError: result.smsError } : {}),
    });
  } catch (err) {
    console.error('OTP resend error:', err);
    return res.status(500).json({ message: 'Failed to resend OTP.' });
  }
});

// POST /api/otp/verify — body: { mobile, otp }
otpRouter.post('/verify', async (req, res) => {
  try {
    const { mobile, otp } = req.body;
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

    return loginResponse(req, res, user);
  } catch (err) {
    console.error('OTP verify error:', err);
    return res.status(500).json({ message: 'Verification failed.' });
  }
});

// POST /api/otp/mobile/send — logged-in user verifies mobile via SMS OTP
otpRouter.post('/mobile/send', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'You must be logged in to register mobile.' });
    }
    const { mobile } = req.body;
    const toNumber = normalizeMobile(mobile);
    if (!toNumber) {
      return res.status(400).json({ message: 'Mobile number is required.' });
    }

    const otp = await createOtpForUser(req.user._id, 'sms');
    const sms = await sendOtpViaSms(toNumber, otp);
    const isDev = process.env.NODE_ENV !== 'production';

    return res.status(200).json({
      message: sms.sent ? 'OTP sent to your mobile via SMS.' : 'Use the OTP below (SMS not sent).',
      otp: isDev ? otp : undefined,
      otpSentViaSms: sms.sent,
    });
  } catch (err) {
    console.error('OTP mobile send error:', err);
    return res.status(500).json({ message: 'Failed to send OTP.' });
  }
});

// POST /api/otp/verify-login
otpRouter.post('/verify-login', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'You must be logged in.' });
    }
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required.' });
    }

    const otpRecord = await Otp.findOne({ userId: req.user._id }).exec();
    if (!otpRecord) {
      return res.status(401).json({ message: 'No OTP found. Please login again.' });
    }
    if (new Date() > new Date(otpRecord.expiryDate)) {
      await Otp.findByIdAndDelete(otpRecord._id);
      return res.status(401).json({ message: 'OTP has expired. Please login again.' });
    }

    const valid = verifyOtpWithSecret(otp, otpRecord.otp);
    if (!valid) {
      return res.status(401).json({ message: 'Incorrect OTP.' });
    }

    await Otp.findByIdAndDelete(otpRecord._id);
    if (req.session) req.session.pendingOtpVerification = false;

    const userObj = req.user.toObject ? req.user.toObject() : req.user;
    const token = signToken(userObj);
    const rolePayload = req.user.roleId
      ? transformRolePermissions(req.user.roleId)
      : { rolename: '', permissions: {} };

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      token,
      user: {
        id: userObj._id,
        name: userObj.name,
        roleId: req.user.roleId && (req.user.roleId._id || req.user.roleId),
        role: rolePayload,
        mobile: userObj.mobile || null,
      },
    });
  } catch (err) {
    console.error('OTP verify-login error:', err);
    return res.status(500).json({ message: 'Verification failed.' });
  }
});

// POST /api/otp/mobile/verify
otpRouter.post('/mobile/verify', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'You must be logged in to verify mobile.' });
    }
    const { mobile, otp } = req.body;
    const toNumber = normalizeMobile(mobile);
    if (!toNumber || !otp) {
      return res.status(400).json({ message: 'Mobile number and OTP are required.' });
    }

    const otpRecord = await Otp.findOne({ userId: req.user._id }).exec();
    if (!otpRecord) {
      return res.status(401).json({ message: 'No OTP found. Please request a new one.' });
    }
    if (new Date() > new Date(otpRecord.expiryDate)) {
      await Otp.findByIdAndDelete(otpRecord._id);
      return res.status(401).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const valid = verifyOtpWithSecret(otp, otpRecord.otp);
    if (!valid) {
      return res.status(401).json({ message: 'Incorrect OTP.' });
    }

    await Otp.findByIdAndDelete(otpRecord._id);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { mobile: toNumber },
      { new: true, runValidators: true },
    )
      .populate('roleId')
      .exec();

    const rolePayload = updatedUser.roleId
      ? transformRolePermissions(updatedUser.roleId)
      : { rolename: '', permissions: {} };
    return res.status(200).json({
      message: 'Mobile number registered successfully.',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        roleId: updatedUser.roleId && (updatedUser.roleId._id || updatedUser.roleId),
        role: rolePayload,
        mobile: updatedUser.mobile,
      },
    });
  } catch (err) {
    console.error('OTP mobile verify error:', err);
    return res.status(500).json({ message: 'Verification failed.' });
  }
});

otpRouter.sendLoginOtp = async function sendLoginOtp(userId, mobile) {
  const otp = await createOtpForUser(userId, 'sms');
  const result = await sendOtpViaSms(mobile, otp);
  return { sent: result.sent };
};

module.exports = otpRouter;
