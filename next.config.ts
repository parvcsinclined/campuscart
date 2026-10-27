import type { NextConfig } from "next";

// Cache Components / partial prefetching are off: every page is per-user and
// request-time, so the static-shell model adds complexity without benefit here.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  serverExternalPackages: ["@prisma/client", "pg"],
};

export default nextConfig;
