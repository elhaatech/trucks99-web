import {
  persistMarketplaceUserId,
} from "@/lib/marketplaceUser";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003";

const TOKEN_KEY = "itruck_token";

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
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type RequestOptions = RequestInit & { params?: Record<string, string> };

const inFlightGet = new Map<string, Promise<unknown>>();

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...init } = options;
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const urlKey = url.toString();
  const isGet = !init.method || init.method === "GET";

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
        throw new Error(data?.message || "Token missing or expired. Please log in again.");
      }
      throw new Error(data?.message || res.statusText || "Request failed");
    }
    return data as T;
  };

  if (isGet && typeof window !== "undefined") {
    let p = inFlightGet.get(urlKey) as Promise<T> | undefined;
    if (!p) {
      p = run().finally(() => {
        inFlightGet.delete(urlKey);
      });
      inFlightGet.set(urlKey, p);
    }
    return p;
  }

  return run();
}

/** Same as api() but never sends Authorization header. Use for public endpoints (register page, etc.) */
export async function publicApi<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...init } = options;
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const urlKey = url.toString();
  const isGet = !init.method || init.method === "GET";

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

  if (isGet && typeof window !== "undefined") {
    let p = inFlightGet.get(urlKey) as Promise<T> | undefined;
    if (!p) {
      p = run().finally(() => inFlightGet.delete(urlKey));
      inFlightGet.set(urlKey, p);
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

export async function blockUnblock(
  entity: BlockUnblockEntity,
  id: string,
  action: "block" | "unblock"
): Promise<{ message: string; [key: string]: unknown }> {
  return api<{ message: string; [key: string]: unknown }>("/api/block-unblock", {
    method: "POST",
    body: JSON.stringify({ entity, id, action }),
  });
}