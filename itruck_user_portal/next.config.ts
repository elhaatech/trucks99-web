import type { NextConfig } from "next";

/**
 * Local: http://localhost:3002/  (no prefix — leave NEXT_PUBLIC_ASSET_PREFIX empty)
 * Production: https://trucks99.elhaa.com/user/
 *
 * Apache already serves JS at /user/_next/... . assetPrefix makes HTML request
 * those URLs instead of /_next/... at the domain root (which 404s).
 *
 * Do not also set basePath to /user — that would double-prefix assets.
 */
function publicAssetPrefix(): string | undefined {
  const raw = (process.env.NEXT_PUBLIC_ASSET_PREFIX || "").trim().replace(/\/$/, "");
  return raw || undefined;
}

const INTERNAL_BACKEND = "http://127.0.0.1:3003";
const assetPrefix = publicAssetPrefix();

const nextConfig: NextConfig = {
  assetPrefix,
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: import.meta.dirname,
  },
  /**
   * Backend `/api` and `/uploads` stay at the site root on purpose
   * (`https://trucks99.elhaa.com/api/...`).
   */
  async rewrites() {
    const backend = INTERNAL_BACKEND.replace(/\/$/, "");
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
      { protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/usear/product",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/usear/product/:path*",
        destination: "/:path*",
        permanent: false,
      },
      {
        source: "/buy-sell",
        destination: "/list",
        permanent: false,
      },
      {
        source: "/buy-sell/:path*",
        destination: "/list",
        permanent: false,
      },
      {
        source: "/product",
        destination: "/list",
        permanent: false,
      },
      {
        source: "/product/:path*",
        destination: "/viewproduct/:path*",
        permanent: false,
      },
      {
        source: "/my-listing",
        destination: "/my-listings",
        permanent: false,
      },
      {
        source: "/my-listing/:path*",
        destination: "/my-listings/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
