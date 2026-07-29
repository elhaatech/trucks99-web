import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
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
