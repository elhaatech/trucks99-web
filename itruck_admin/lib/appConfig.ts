/**
 * Public deployment path and production API origin for the Admin Portal.
 *
 * Apache serves this app at https://trucks99.elhaa.com/admin/ and strips `/admin`
 * before forwarding to port 3004, so Next.js pages stay at `/` and `/admin/portal`.
 * Do not set Next.js `basePath` to `/admin` — that would turn portal routes into
 * `/admin/admin/portal`.
 *
 * `assetPrefix` in next.config.ts makes `/_next` assets load from `/admin/_next`.
 * Do not use .env for these values.
 */

export const PUBLIC_URL_PREFIX = "/admin";

export const PRODUCTION_API_ORIGIN = "https://trucks99.elhaa.com";

export const LOCAL_BACKEND_PORT = "3003";

export const PRODUCTION_HOSTS = new Set([
  "trucks99.elhaa.com",
  "www.trucks99.elhaa.com",
]);
