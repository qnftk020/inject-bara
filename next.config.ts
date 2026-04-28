import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
