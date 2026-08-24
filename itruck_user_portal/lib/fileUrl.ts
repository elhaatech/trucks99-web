import { resolveApiBase } from "@/lib/apiBase";
import { withAppBasePath } from "@/lib/appConfig";

function isLocalApiOrigin(base: string): boolean {
  try {
    const { hostname } = new URL(base);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
    );
  } catch {
    return true;
  }
}

function isFrontendStaticPath(pathname: string): boolean {
  return (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  );
}

/**
 * Apache only forwards `/api/...` to Express. Uploads live at `/uploads` on the
 * API process, so production browsers must request `/api/uploads/...` which
 * Apache strips back to `/uploads/...`.
 */
function withApiUploads(base: string, uploadsPath: string, search = ""): string {
  const p = uploadsPath.startsWith("/") ? uploadsPath : `/${uploadsPath}`;
  if (isLocalApiOrigin(base)) return `${base}${p}${search}`;
  return `${base}/api${p}${search}`;
}

function normalizeUploadsPath(pathname: string): string {
  if (pathname.startsWith("/api/uploads")) return pathname.slice("/api".length);
  return pathname;
}

/**
 * Resolve a DB/API file path to a browser URL.
 * - `/uploads/...` → API origin (with `/api/uploads` in production)
 * - `/images`, `/assets` → this portal's public prefix (`/user`)
 * - localhost/legacy absolute upload URLs are rewritten to the current API origin
 */
export function resolvePublicFileUrl(path?: string | null): string {
  if (path == null) return "";
  let trimmed = String(path).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return trimmed;

  const doubled = trimmed.match(/^(https?:\/\/[^/\s]+)(https?:\/\/\S+)$/i);
  if (doubled) trimmed = doubled[2];

  const base = resolveApiBase().replace(/\/$/, "");

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.pathname.startsWith("/uploads") ||
        parsed.pathname.startsWith("/api/uploads")
      ) {
        return withApiUploads(
          base,
          normalizeUploadsPath(parsed.pathname),
          parsed.search,
        );
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
    return withApiUploads(base, normalizeUploadsPath(normalized));
  }
  return `${base}${normalized}`;
}

export const getFileUrl = resolvePublicFileUrl;
