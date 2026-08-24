import type { NextConfig } from "next";

/**
 * Local: http://localhost:3004/  (no public prefix)
 * Production: https://trucks99.elhaa.com/admin/
 *
 * Apache already serves JS at /admin/_next/... and strips `/admin` when
 * forwarding to this process. Do not set `basePath` to `/admin` — App Router
 * pages already live at `/admin/portal`.
 */
const PRODUCTION_API_ORIGIN = "https://trucks99.elhaa.com";
const PRODUCTION_ASSET_PREFIX = "/admin";
const INTERNAL_BACKEND = "http://127.0.0.1:3003";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  assetPrefix: isProd ? PRODUCTION_ASSET_PREFIX : undefined,
  env: {
    NEXT_PUBLIC_API_URL: isProd
      ? PRODUCTION_API_ORIGIN
      : "http://127.0.0.1:3003",
  },
  /**
   * Proxy backend API through the Next.js origin for local/LAN.
   * `/portal` rewrites exist because Apache strips `/admin` from
   * `/admin/portal/...` before the request reaches this process.
   */
  async rewrites() {
    const backend = INTERNAL_BACKEND.replace(/\/$/, "");
    return {
      beforeFiles: [
        {
          source: "/portal",
          destination: "/admin/portal",
        },
        {
          source: "/portal/:path*",
          destination: "/admin/portal/:path*",
        },
      ],
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${backend}/api/:path*`,
        },
        {
          source: "/uploads/:path*",
          destination: `${backend}/uploads/:path*`,
        },
      ],
    };
  },
  images: {
    /**
     * Apache strips `/admin`, so `/_next/image` at the domain root 404s.
     * Serve public files directly from `/admin/images`.
     */
    unoptimized: isProd,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "3003", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "3003", pathname: "/**" },
      { protocol: "http", hostname: "truck.elhaa.com", port: "3003", pathname: "/**" },
      { protocol: "https", hostname: "truck.elhaa.com", port: "3003", pathname: "/**" },
      { protocol: "http", hostname: "www.truck.elhaa.com", port: "3003", pathname: "/**" },
      { protocol: "https", hostname: "www.truck.elhaa.com", port: "3003", pathname: "/**" },
      { protocol: "http", hostname: "46.202.176.124", port: "3003", pathname: "/**" },
      { protocol: "https", hostname: "46.202.176.124", port: "3003", pathname: "/**" },
      { protocol: "https", hostname: "trucks99.elhaa.com", pathname: "/**" },
      { protocol: "http", hostname: "trucks99.elhaa.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
