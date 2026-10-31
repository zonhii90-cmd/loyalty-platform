import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        // Customer-facing join page: always fresh so new JS deploys load immediately
        source: '/join/:slug*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        // POS screen: same reason
        source: '/pos/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
