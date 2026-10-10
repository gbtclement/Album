import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autonome (dossier .next/standalone) pour une image Docker légère
  output: "standalone",
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
