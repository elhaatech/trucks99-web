import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
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
    ],
  },
  /** Legacy URLs from monolith itruck_ui (`/usear/product/*`) */
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
    ];
  },
};

export default nextConfig;
