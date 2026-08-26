import { persistMarketplaceUserId, clearMarketplaceAuthStorage } from "@/lib/marketplaceUser";
import { joinApiUrl, resolveApiBase } from "@/lib/apiBase";
import { API_BASE_URL } from "@/src/config/BASE_URL";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { notifyMarketplaceAuthChanged } from "@/lib/marketplaceAuth";

/**
 * Fixed copy of model/services/common.ts that uses a correct Authorization header.
 * This is used where direct edits to the original file were unsafe. Prefer to
 * consolidate to this implementation when possible.
 */

export const API_BASE = API_BASE_URL.replace(/\/+$/, "");
export { resolveApiBase, joinApiUrl };

const TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    const fromJwt = token.split(".")[1];
    if (fromJwt) {
      try {
        const padded = fromJwt.replace(/-/g, "+").replace(/_/g, "/");
        const json = JSON.parse(atob(padded)) as { id?: unknown };
        if (json.id != null) persistMarketplaceUserId(String(json.id));
      } catch {
        /* ignore */
      }
    }
  }
}

export function clearToken(): void {
  clearMarketplaceAuthStorage();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type RequestOptions = RequestInit & { params?: Record<string, string> };

const inFlightRequests = new Map<string, Promise<unknown>>();

function flightKey(method: string, urlKey: string, body: BodyInit | null | undefined): string {
  const bodyPart = typeof body === "string" ? body : body == null ? "" : "[non-string-body]";
  return `${method.toUpperCase()} ${urlKey} ${bodyPart}`;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  const url = new URL(path.startsWith("http") ? path : joinApiUrl(path));
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const urlKey = url.toString();
  const method = (init.method || "GET").toUpperCase();
  const key = flightKey(method, urlKey, init.body);

  const run = async (): Promise<T> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(init.headers as Record<string, string>),
    };

    const res = await fetch(urlKey, {
      ...init,
      credentials: "include",
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        clearToken();
        notifyMarketplaceAuthChanged();
        throw new Error(data?.message || "Token missing or expired. Please log in again.");
      }
      throw new Error(data?.message || res.statusText || "Request failed");
    }
    return data as T;
  };

  if (typeof window !== "undefined" && !init.signal) {
    let p = inFlightRequests.get(key) as Promise<T> | undefined;
    if (!p) {
      p = run().finally(() => {
        inFlightRequests.delete(key);
      });
      inFlightRequests.set(key, p);
    }
    return p;
  }

  return run();
}

export async function publicApi<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  const url = new URL(path.startsWith("http") ? path : joinApiUrl(path));
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const urlKey = url.toString();
  const method = (init.method || "GET").toUpperCase();
  const key = `public:${flightKey(method, urlKey, init.body)}`;

  const run = async (): Promise<T> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    };

    const res = await fetch(urlKey, {
      ...init,
      credentials: "include",
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || res.statusText || "Request failed");
    }
    return data as T;
  };

  if (typeof window !== "undefined" && !init.signal) {
    let p = inFlightRequests.get(key) as Promise<T> | undefined;
    if (!p) {
      p = run().finally(() => inFlightRequests.delete(key));
      inFlightRequests.set(key, p);
    }
    return p;
  }

  return run();
}

export function getRowId<T extends { id?: string; _id?: string }>(item: T): string {
  return (item?.id ?? item?._id ?? "") as string;
}

export type BlockUnblockEntity =
  | "agent"
  | "shipper"
  | "loader"
  | "buySell"
  | "driver"
  | "income-expense-category"
  | "user"
  | "material"
  | "income-expense"
  | "vehicle-type"
  | "vehicle-body-type"
  | "company-start-country";

export async function blockUnblock(entity: BlockUnblockEntity, id: string, action: "block" | "unblock"): Promise<{ message: string; [key: string]: unknown }> {
  return api<{ message: string; [key: string]: unknown }>("/api/block-unblock", {
    method: "POST",
    body: JSON.stringify({ entity, id, action }),
  });
}
