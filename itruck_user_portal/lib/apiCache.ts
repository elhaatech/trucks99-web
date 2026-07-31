/**
 * Tiny client-side cache + in-flight dedupe for marketplace GETs/POSTs.
 * Shared promises stop React Strict Mode double-mount from doubling network calls.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(prefixOrKey: string): void {
  for (const key of cache.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      cache.delete(key);
    }
  }
  for (const key of inFlight.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      inFlight.delete(key);
    }
  }
}

/**
 * Deduplicate concurrent identical requests and optionally cache the result.
 */
export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 30_000,
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = fetcher()
    .then((value) => {
      if (ttlMs > 0) setCached(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; code?: string; message?: string };
  return (
    e.name === "AbortError" ||
    e.name === "CanceledError" ||
    e.code === "ERR_CANCELED" ||
    /aborted|canceled|cancelled/i.test(String(e.message ?? ""))
  );
}
