const User = require("../schema/user");
const { verifyToken } = require("./jwt");

/**
 * Optional JWT middleware: if Authorization Bearer is present and valid, set req.user.
 * Invalid, expired, or unknown tokens do NOT abort the request — public routes can
 * still proceed anonymously; protected routes are enforced by requireAuthUnlessPublic.
 */
async function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

  const token = authHeader.slice(7).trim();
  if (!token) return next();

  const payload = verifyToken(token);
  if (!payload || !payload.id) return next();

  try {
    let user;
    if (/^[a-fA-F0-9]{24}$/.test(String(payload.id))) {
      user = await User.findById(payload.id);
    } else {
      user =
        (await User.findOne({ id: payload.id }).exec()) ||
        (await User.findOne({ uuid: payload.id }).exec());
    }
    if (user) {
      user = await User.findById(user._id)
        .populate({ path: "roleId", populate: { path: "permissions" } })
        .populate("permissions")
        .exec();
    }
    if (user) {
      req.user = user;
      req.authenticatedViaBearer = true;
    }
  } catch {
    /* treat as anonymous */
  }
  next();
}

module.exports = { jwtAuth };
