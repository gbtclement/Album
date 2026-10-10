import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autonome (dossier .next/standalone) pour une image Docker légère
  output: "standalone",
  // Pas de pastille « N » de Next.js en développement : elle se posait sur la barre de jeu (en bas à gauche)
  devIndicators: false,
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
