const express = require('express');

const loginRouter = express.Router();

/**
 * POST /api/login
 * Email + password login removed. Use OTP (POST /api/otp/send, /api/otp/verify) or OAuth.
 */
loginRouter.post('/', (req, res) => {
  return res.status(400).json({ message: 'Email/password login is disabled. Use Mobile OTP or social login.' });
});

module.exports = loginRouter;


