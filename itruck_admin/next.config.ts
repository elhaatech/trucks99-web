import type { NextConfig } from "next";

/**
 * Local: http://localhost:3004/  (no prefix — leave NEXT_PUBLIC_ASSET_PREFIX empty)
 * Production: https://trucks99.elhaa.com/admin/
 *
 * Apache already serves JS at /admin/_next/... . assetPrefix makes HTML request
 * those URLs instead of /_next/... at the domain root (which 404s).
 *
 * Do not also set basePath to /admin — App Router pages already live at
 * /admin/portal, and a basePath would turn them into /admin/admin/portal.
 */
function publicAssetPrefix(): string | undefined {
  const raw = (process.env.NEXT_PUBLIC_ASSET_PREFIX || "").trim().replace(/\/$/, "");
  return raw || undefined;
}

function publicApiUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003").trim();
  return raw
    .replace(/localhost:300[01245]/g, "localhost:3003")
    .replace(/127\.0\.0\.1:300[01245]/g, "127.0.0.1:3003");
}

const assetPrefix = publicAssetPrefix();

const nextConfig: NextConfig = {
  assetPrefix,
  skipTrailingSlashRedirect: true,
  env: {
    NEXT_PUBLIC_API_URL: publicApiUrl(),
  },
  /**
   * Proxy backend API through the Next.js origin.
   * Backend always runs on port 3003 unless BACKEND_INTERNAL_URL is set.
   */
  async rewrites() {
    const backend = (
      process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:3003"
    ).replace(/\/$/, "");
    return {
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
