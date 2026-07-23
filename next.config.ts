import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.0.136"],
  // A TIG PDF route betűkészlet-fájljait a serverless bundle-be húzzuk (Vercel).
  outputFileTracingIncludes: {
    "/api/tig/[packageId]/export/pdf": ["./src/lib/pdf/fonts/**"]
  },
  turbopack: {
    resolveAlias: {
      canvas: "./empty.js"
    }
  }
};

export default nextConfig;
