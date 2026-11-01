import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        // Customer-facing join page: bypass Vercel CDN + browser cache on every edge node
        source: '/join/:slug*',
        headers: [
          { key: 'Cache-Control',           value: 'no-store, no-cache, must-revalidate' },
          { key: 'CDN-Cache-Control',        value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
      {
        // POS screen: same — staff must always see fresh JS
        source: '/pos/:path*',
        headers: [
          { key: 'Cache-Control',           value: 'no-store, no-cache, must-revalidate' },
          { key: 'CDN-Cache-Control',        value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
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
