/**
 * App-wide HTTP client re-export. Domain code should call `model/services/*` functions
 * which use this client internally — avoid importing this from UI components directly.
 */
export {
  api,
  API_BASE,
  resolveApiBase,
  joinApiUrl,
  getAuthHeaders,
  setToken,
  clearToken,
  getRowId,
  blockUnblock,
  type RequestOptions,
  type BlockUnblockEntity,
} from "@/model/services/common";
