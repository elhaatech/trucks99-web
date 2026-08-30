/**
 * Public marketplace routes for vehicle buy/sell (handlebuysellProduct).
 * Mounted in app.js at /api/buy-sell and /api/buysell (alias).
 * Writes (POST /add, cart, payments, etc.) always require auth via requireAuthUnlessPublic.
 */

const BUY_SELL_API_PREFIXES = [
  "/api/buy-sell",
  "/api/buysell",
  "/api-v1/buy-sell",
  "/api-v1/buysell",
  "/buy-sell",
  "/buysell",
];

/** Single-segment paths that must never be public GET shortcuts. */
const PROTECTED_TOP_SEGMENTS = new Set([
  "add",
  "delete",
  "cart",
  "status-counts",
  "purchase-list",
  "bulk-upload",
  "payment",
  "book",
  "purchase",
  "edit",
  "bit",
  "list",
  "all",
  "dashboard-stats",
  "recent-vehicles",
  "featured-vehicles",
  "featured-vehicles/list",
  "products",
]);

function matchBuySellPath(path) {
  for (const prefix of BUY_SELL_API_PREFIXES) {
    if (path === prefix) return { prefix, subPath: "" };
    if (path.startsWith(prefix + "/")) {
      return { prefix, subPath: path.slice(prefix.length + 1) };
    }
  }
  return null;
}

/**
 * @param {string} method
 * @param {string} originalUrlPath — no query string
 */
function isPublicBuySellMarketplaceRoute(method, originalUrlPath) {
  const matched = matchBuySellPath(originalUrlPath);
  if (!matched) return false;

  const { subPath } = matched;
  if (!subPath) return false;

  if (method === "GET" && subPath === "all") return true;
  if (method === "GET" && subPath === "dashboard-stats") return true;
  if (method === "POST" && subPath === "recent-vehicles") return true;
  if (method === "POST" && subPath === "list") return true;
  if (method === "POST" && subPath.startsWith("products/owner/")) return true;
  if (method === "PATCH" && /^[^/]+\/view$/.test(subPath)) return true;

  if (method === "GET") {
    const top = subPath.split("/")[0].toLowerCase();
    if (PROTECTED_TOP_SEGMENTS.has(top)) return false;
    if (subPath.includes("/")) return false;
    return true;
  }

  return false;
}

module.exports = {
  BUY_SELL_API_PREFIXES,
  isPublicBuySellMarketplaceRoute,
};
