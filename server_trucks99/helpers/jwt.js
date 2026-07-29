const jwt = require('jsonwebtoken');

const JWT_SECRET = (process.env.JWT_SECRET || process.env.SESSION_SECRET || 'change-me-in-production').trim();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT for the given user (after full auth e.g. OTP verified).
 * Payload: { id, mobile?, iat, exp }
 */
function signToken(user) {
  // Always use _id (ObjectId) for JWT - User.findById expects ObjectId, not UUID
  const id = user._id?.toString?.();
  const fallbackId = typeof user.id === 'string' && /^[a-fA-F0-9]{24}$/.test(user.id) ? user.id : null;
  const payload = {
    id: id || fallbackId,
    ...(user.mobile && { mobile: user.mobile }),
  };
  if (!payload.id) throw new Error('Cannot sign token: user has no _id');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT. Returns payload or null.
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken, JWT_SECRET };
