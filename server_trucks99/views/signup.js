const express = require('express');

const SignupRouter = express.Router();
const User = require('../schema/user.js');
const Role = require('../schema/role.js');
const { normalizeMobile } = require('../helpers/otpHelper');
const { resolveToObjectId } = require('../helpers/uuidHelper');
const { createAndSendOtp } = require('../helpers/mobileOtpService');

/**
 * POST /api/signup
 * Body: name, roleId, mobile (required for OTP login), company_name (optional),
 *       profileImage (optional), termsAccepted (optional).
 */
SignupRouter.post('/', async (req, res) => {
  try {
    const {
      name,
      roleId,
      mobile,
      company_name,
      city,
      state,
      country,
      profileImage,
      termsAccepted,
    } = req.body;
    const mobileNormalized = normalizeMobile(mobile);
    if (!mobileNormalized) {
      return res.status(400).json({ message: 'mobile is required' });
    }

    const existingMobile = await User.findOne({ mobile: mobileNormalized });
    if (existingMobile) {
      return res.status(400).json({ message: 'This mobile number is already registered.' });
    }

    const resolvedRoleId = roleId ? await resolveToObjectId(Role, roleId) : null;
    if (roleId && !resolvedRoleId) {
      return res.status(400).json({ message: 'Invalid roleId' });
    }

    const newUser = new User({
      name: name || mobileNormalized,
      roleId: resolvedRoleId,
      mobile: mobileNormalized,
      company_name: company_name || null,
      city: city || null,
      state: state || null,
      country: country || null,
      email: `m_${mobileNormalized}@otp.user`,
      provider: 'local',
      profileImage: profileImage || null,
      termsAccepted: termsAccepted === true,
    });
    const user = await newUser.save();

    const populated = await User.findById(user._id).populate('roleId').lean();
    const userObj = { ...populated };
    if (populated && populated.roleId) {
      userObj.role = populated.roleId;
      delete userObj.roleId;
    }

    let otpSentToMobile = false;
    let otpSendError;
    let otpForDev;
    try {
      const otpResult = await createAndSendOtp(mobileNormalized);
      otpSentToMobile = !!otpResult.sent;
      if (otpResult.otpForDev) otpForDev = otpResult.otpForDev;
      if (!otpResult.ok) otpSendError = otpResult.error;
    } catch (e) {
      otpSendError = e.message || 'OTP send failed';
      console.error('Signup OTP send error:', e);
    }

    const payload = {
      message: otpSentToMobile
        ? 'Signup successful. Verify OTP via SMS: POST /api/auth/verify-otp with { mobile, otp }.'
        : 'Signup successful. OTP SMS could not be sent. Use Resend OTP on the login screen.',
      loginType: 'otp_only',
      otpSentToMobile,
      otpSentViaSms: otpSentToMobile,
      userObj,
    };
    if (otpForDev) payload.otpForDev = otpForDev;
    if (otpSendError && !otpSentToMobile) payload.otpSendError = otpSendError;
    res.status(200).json(payload);
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: err?.message || 'Signup failed' });
  }
});

module.exports = SignupRouter;
