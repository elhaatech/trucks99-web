import { joinApiUrl } from "@/src/config/BASE_URL";
import { withAppBasePath } from "@/lib/appConfig";

function isFrontendStaticPath(pathname: string): boolean {
  return (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  );
}

function normalizeUploadsPath(pathname: string): string {
  if (pathname.startsWith("/api/uploads")) return pathname.slice("/api".length);
  return pathname;
}

/**
 * Resolve a DB/API file path to a browser URL.
 * - `/uploads/...` → API_BASE_URL + uploads path
 * - `/images`, `/assets` → this portal's public prefix (`/admin` or `/user`)
 */
export function resolvePublicFileUrl(path?: string | null): string {
  if (path == null) return "";
  let trimmed = String(path).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return trimmed;

  const doubled = trimmed.match(/^(https?:\/\/[^/\s]+)(https?:\/\/\S+)$/i);
  if (doubled) trimmed = doubled[2];

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.pathname.startsWith("/uploads") ||
        parsed.pathname.startsWith("/api/uploads")
      ) {
        return `${joinApiUrl(normalizeUploadsPath(parsed.pathname))}${parsed.search}`;
      }
      if (isFrontendStaticPath(parsed.pathname)) {
        return withAppBasePath(`${parsed.pathname}${parsed.search}`);
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (isFrontendStaticPath(normalized)) return withAppBasePath(normalized);
  if (normalized.startsWith("/uploads") || normalized.startsWith("/api/uploads")) {
    return joinApiUrl(normalizeUploadsPath(normalized));
  }
  return joinApiUrl(normalized);
}

export const getFileUrl = resolvePublicFileUrl;
