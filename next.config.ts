import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Build autonome (dossier .next/standalone) pour une image Docker légère
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
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
