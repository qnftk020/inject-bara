import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root,
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/bookmarklet.html',
      },
    ];
  },
};

export default nextConfig;
