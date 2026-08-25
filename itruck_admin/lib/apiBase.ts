import { API_BASE_URL, joinApiUrl } from "@/src/config/BASE_URL";

export { joinApiUrl };
export { API_BASE_URL };

/** API base without a trailing slash. Prefer joinApiUrl() when concatenating paths. */
export function resolveApiBase(): string {
  return API_BASE_URL.replace(/\/+$/, "");
}
