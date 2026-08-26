import { joinApiUrl } from "@/src/config/BASE_URL";
import { stripAppBasePath, withAppBasePath } from "@/lib/appConfig";

function isFrontendStaticPath(pathname: string): boolean {
  const path = stripAppBasePath(pathname).split("?")[0];
  const prefixes = ["/assets/", "/images/", "/_next/"];
  if (path === "/favicon.ico") return true;
  return prefixes.some((prefix) => path.startsWith(prefix));
}

function normalizeUploadsPath(pathname: string): string {
  if (pathname.startsWith("/api/uploads")) return pathname.slice("/api".length);
  return pathname;
}

/**
 * Resolve a DB/API file path to a browser URL.
 * - `/uploads/...` → API_BASE_URL + uploads path
 * - `/images`, `/assets` → this portal's public files at the host root
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
      const pathname = stripAppBasePath(parsed.pathname);
      if (
        pathname.startsWith("/uploads") ||
        pathname.startsWith("/api/uploads")
      ) {
        return `${joinApiUrl(normalizeUploadsPath(pathname))}${parsed.search}`;
      }
      if (isFrontendStaticPath(pathname)) {
        return withAppBasePath(`${pathname}${parsed.search}`);
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  const normalized = stripAppBasePath(
    trimmed.startsWith("/") ? trimmed : `/${trimmed}`,
  );
  const q = normalized.indexOf("?");
  const pathOnly = q === -1 ? normalized : normalized.slice(0, q);
  const search = q === -1 ? "" : normalized.slice(q);
  if (isFrontendStaticPath(pathOnly)) return withAppBasePath(normalized);
  if (pathOnly.startsWith("/uploads") || pathOnly.startsWith("/api/uploads")) {
    return `${joinApiUrl(normalizeUploadsPath(pathOnly))}${search}`;
  }
  return joinApiUrl(normalized);
}

export const getFileUrl = resolvePublicFileUrl;
