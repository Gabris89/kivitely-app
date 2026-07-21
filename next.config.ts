import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.0.136"],
  turbopack: {
    resolveAlias: {
      canvas: "./empty.js"
    }
  }
};

export default nextConfig;
