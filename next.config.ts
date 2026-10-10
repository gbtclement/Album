import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Build autonome (dossier .next/standalone) pour une image Docker légère
  output: "standalone",
  cacheComponents: true,
  // L'application est entièrement personnalisée (session, base de données) : la validation
  // automatique des navigations instantanées n'a pas de sens partout. Seules les pages qui
  // déclarent `export const instant` seraient vérifiées.
  experimental: {
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
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
