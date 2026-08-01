/**
 * Middleware: Require valid Bearer token. Session cookie alone is NOT accepted.
 * Returns 401 with clear message when token is missing or expired.
 */
function requireAuth(req, res, next) {
  if (req.user && req.authenticatedViaBearer) return next();
  return res
    .status(401)
    .json({ message: "Token missing or expired. Please log in again." });
}

/** Paths that do NOT require authentication (any method) */
const PUBLIC_PATHS = [
  "/api/login",
  "/api/signup",
  "/api/logout",
  "/api/auth/google",
  "/api/auth/github",
  "/api/otp/send",
  "/api/otp/verify",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/resend-otp",
  "/api/company-start-country",
  "/api/role",
];

/** Path + method combinations that are public */
const PUBLIC_METHOD_PATHS = [
  // { method: "GET", path: "/api/role" },
  { method: "POST", path: "/api/role" },
  { method: "POST", path: "/api/role/add" },
  { method: "POST", path: "/api/permission/add" },

  { method: "POST", path: "/api/permission/edit" },
  { method: "POST", path: "/api/otp/verify" },
  { method: "POST", path: "/api/auth/send-otp" },
  { method: "POST", path: "/api/auth/verify-otp" },
  { method: "POST", path: "/api/auth/resend-otp" },
  { method: "GET", path: "/api/company-start-country/all" },
  { method: "GET", path: "/api/company-start-country" },
  // Allow external cron/scheduler to trigger subscription expiry check
  { method: "GET", path: "/api/payment/check-expired" },
  // { method: "POST", path: "/api/company-start-country/add" },
  // { method: "PUT", path: "/api/company-start-country/edit" },
  // { method: "DELETE", path: "/api/company-start-country/delete" }, // ← ADDED: allow without token
  // ✅ Allow public read access to the location hierarchy
  // (needed for the registration page's Country/State/City dropdowns,
 { method: "GET", path: "/api/location/countries/all" },
  { method: "GET", path: "/api/location/countries" },
  { method: "POST", path: "/api/location/states/by-country" },
  { method: "GET", path: "/api/location/states" },
  { method: "POST", path: "/api/location/cities/by-state" },
  { method: "GET", path: "/api/location/cities" },
  { method: "GET", path: "/api/advertisement/active" },
  { method: "GET", path: "/api/ads/active" },
  { method: "GET", path: "/api/emi/tenures" },
  { method: "POST", path: "/api/emi/calculate" },
  { method: "GET", path: "/api/category/all" },
  { method: "GET", path: "/api/buy-sell/dashboard-stats" },
  { method: "GET", path: "/api/buysell/dashboard-stats" },
  { method: "POST", path: "/api/buy-sell/recent-vehicles" },
  { method: "POST", path: "/api/buysell/recent-vehicles" },
  { method: "POST", path: "/api/buy-sell/featured-vehicles/list" },
  { method: "POST", path: "/api/buysell/featured-vehicles/list" },
];

const { isPublicBuySellMarketplaceRoute } = require("./buySellPublicRoutes");
const { isPublicProductBitRecordRoute } = require("./bitRecordPublicRoutes");

function isPublicPath(path) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

function isPublicMethodPath(method, path) {
  const p = path.split("?")[0];
  return PUBLIC_METHOD_PATHS.some(
    (x) => x.method === method && (p === x.path || p.startsWith(x.path + "/")),
  );
}

/**
 * Middleware: Require auth for all /api/* except public paths.
 */
function requireAuthUnlessPublic(req, res, next) {
  // Preflight must never require auth (browser sends OPTIONS without token)
  if (req.method === "OPTIONS") return next();
  if (!req.originalUrl.startsWith("/api")) return next();
  const path = req.originalUrl.split("?")[0];
  if (isPublicPath(path)) return next();
  if (isPublicMethodPath(req.method, path)) return next();
  if (isPublicBuySellMarketplaceRoute(req.method, path)) return next();
  if (isPublicProductBitRecordRoute(req, path)) return next();
  return requireAuth(req, res, next);
}

module.exports = { requireAuth, requireAuthUnlessPublic };
