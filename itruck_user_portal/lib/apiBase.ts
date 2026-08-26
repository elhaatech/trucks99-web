import { API_BASE_URL, getActiveApiBaseUrl, joinApiUrl } from "@/src/config/BASE_URL";

export { joinApiUrl };
export { API_BASE_URL, getActiveApiBaseUrl };

/** API base without a trailing slash. Prefer joinApiUrl() when concatenating paths. */
export function resolveApiBase(): string {
  return getActiveApiBaseUrl().replace(/\/+$/, "");
}
