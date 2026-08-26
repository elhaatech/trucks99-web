/**
 * OTP / API origin by environment:
 *
 * local:      http://localhost:3002/api/otp/send
 * testing:    https://trucks99.elhaa.com/api/otp/send
 * production: https://trucks99.com/api-v1/otp/send
 *
 * Service paths stay `/api/...`. joinApiUrl strips the extra `/api` because
 * each base already ends with `/api/` or `/api-v1/`.
 */
export const BASE_URLS = {
  local: "http://localhost:3002/api/",
  testing: "https://trucks99.elhaa.com/api/",
  production: "https://trucks99.com/api-v1/",
};

export const API_BASE_URL = BASE_URLS.testing;

function hostWithoutWww(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

/** Browser host picks local / testing / production. */
export function getActiveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = hostWithoutWww(window.location.hostname);
    if (host === "trucks99.com") return BASE_URLS.production;
    if (host === "trucks99.elhaa.com") return BASE_URLS.testing;
    if (host === "localhost" || host === "127.0.0.1") {
      return `${window.location.origin}/api/`;
    }
  }
  return API_BASE_URL;
}

/**
 * Join the active API base with an endpoint without duplicate slashes.
 * Service paths stay as `/api/...`; the `/api` prefix is stripped because
 * the base already includes `/api/` or `/api-v1/`.
 */
export function joinApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = getActiveApiBaseUrl().replace(/\/+$/, "");
  let endpoint = String(path || "")
    .trim()
    .replace(/^\/+/, "");

  if (endpoint === "api" || endpoint.startsWith("api/")) {
    endpoint = endpoint.slice(3).replace(/^\/+/, "");
  }

  if (!endpoint) {
    return `${base}/`;
  }

  return `${base}/${endpoint}`;
}
