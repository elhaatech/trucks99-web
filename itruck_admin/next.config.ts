import type { NextConfig } from "next";

function publicApiUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003").trim();
  return raw
    .replace(/localhost:300[01245]/g, "localhost:3003")
    .replace(/127\.0\.0\.1:300[01245]/g, "127.0.0.1:3003");
}

const nextConfig: NextConfig = {
  trailingSlash: false,
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
    ],
  },
};

export default nextConfig;
