/**
 * Apache at trucks99.elhaa.com proxies `/api/` with a trailing slash, which
 * strips the `/api` prefix before Express (so `/api/user` arrives as `/user`).
 * GET `/` still maps to the health check. Restore `/api` for every other path
 * so existing `/api/...` routers match. Direct hits to port 3003 are unchanged.
 */
function restoreStrippedApiPrefix(req, res, next) {
  const raw = req.originalUrl || req.url || "";
  const q = raw.indexOf("?");
  const pathname = q === -1 ? raw : raw.slice(0, q);
  const search = q === -1 ? "" : raw.slice(q);

  if (
    pathname === "/" ||
    pathname === "" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads")
  ) {
    return next();
  }

  const restoredPath =
    "/api" + (pathname.startsWith("/") ? pathname : `/${pathname}`);
  const restored = restoredPath + search;
  req.url = restored;
  req.originalUrl = restored;
  next();
}

module.exports = { restoreStrippedApiPrefix };
