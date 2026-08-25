export const BASE_URLS = {
  testing: "https://trucks99.elhaa.com/api/",
  production: "https://trucks99.com/api-v1/",
};

export const API_BASE_URL = BASE_URLS.testing;

/**
 * Join API_BASE_URL with an endpoint without duplicate slashes.
 * Service paths stay as `/api/...`; the `/api` prefix is stripped because
 * API_BASE_URL already includes `/api/` or `/api-v1/`.
 */
export function joinApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = API_BASE_URL.replace(/\/+$/, "");
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
