/**
 * Apache at trucks99.elhaa.com proxies `/api/` with a trailing slash, which
 * strips the `/api` prefix before Express (so `/api/user` arrives as `/user`).
 * Client production (trucks99.com) uses `/api-v1/...` while Express routers
 * are mounted at `/api/...`. Rewrite `/api-v1` to `/api` first.
 * GET `/` still maps to the health check. Direct hits to port 3003 are unchanged.
 */
function restoreStrippedApiPrefix(req, res, next) {
  const raw = req.originalUrl || req.url || "";
  const q = raw.indexOf("?");
  const pathname = q === -1 ? raw : raw.slice(0, q);
  const search = q === -1 ? "" : raw.slice(q);

  if (pathname === "/api-v1" || pathname.startsWith("/api-v1/")) {
    const rest = pathname.slice("/api-v1".length) || "/";
    const restoredPath = "/api" + (rest.startsWith("/") ? rest : `/${rest}`);
    req.url = restoredPath + search;
    req.originalUrl = restoredPath + search;
    return next();
  }

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
