import type { NextConfig } from "next";

/**
 * Local: http://localhost:3002/
 * Production: https://trucks99.com/  (no `/user` prefix)
 *
 * Do not set Next.js `basePath` to `/user`. Old `/user/...` URLs redirect below.
 */
const INTERNAL_BACKEND = "http://127.0.0.1:3003";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: import.meta.dirname,
  },
  /**
   * Backend `/api` and `/uploads` stay at the site root on purpose for the
   * Apache reverse proxy. Browser API calls use src/config/BASE_URL.ts.
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
          source: "/api-v1/:path*",
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
     * Public files are served from `/images` and `/assets` at the host root.
     * `unoptimized` avoids `/_next/image` on Apache in production.
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
      { protocol: "https", hostname: "trucks99.com", pathname: "/**" },
      { protocol: "http", hostname: "trucks99.com", pathname: "/**" },
      { protocol: "https", hostname: "www.trucks99.com", pathname: "/**" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/user",
        destination: "/",
        permanent: false,
      },
      {
        source: "/user/",
        destination: "/",
        permanent: false,
      },
      {
        source: "/user/:path*",
        destination: "/:path*",
        permanent: false,
      },
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
        source: "/portal/products/:id",
        destination: "/viewproduct/:id",
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
