import type { NextConfig } from "next";

/**
 * Public URL: https://trucks99.elhaa.com/user/
 * `basePath` makes pages, `/_next` chunks, and next/link resolve under `/user`.
 * Do not also set `assetPrefix` to `/user` — Next.js would double-prefix assets.
 *
 * Reverse proxy must forward `/user` to this app WITHOUT stripping the prefix,
 * e.g. proxy_pass http://127.0.0.1:3002;  (no trailing slash on the target).
 */
const APP_BASE_PATH = "/user";
const INTERNAL_BACKEND = "http://127.0.0.1:3003";

const nextConfig: NextConfig = {
  basePath: APP_BASE_PATH,
  /**
   * Production is opened as `/user/` (trailing slash). Apache currently 404s
   * `/user` without a slash. Do not 308 `/user/` → `/user`.
   */
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: import.meta.dirname,
  },
  /**
   * Backend `/api` and `/uploads` stay at the site root on purpose
   * (`https://trucks99.elhaa.com/api/...`), not under `/user/api`.
   * `basePath: false` so these match the real backend paths, not `/user/api`.
   */
  async rewrites() {
    const backend = INTERNAL_BACKEND.replace(/\/$/, "");
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${backend}/api/:path*`,
          basePath: false,
        },
        {
          source: "/uploads/:path*",
          destination: `${backend}/uploads/:path*`,
          basePath: false,
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
