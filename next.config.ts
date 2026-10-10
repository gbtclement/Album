import type { NextConfig } from "next";

// En-têtes de sécurité envoyés avec chaque page. HSTS (HTTPS obligatoire pendant un an) n'est pris en compte
// par les navigateurs qu'en HTTPS : sans effet en local, actif dès que le site est servi avec son certificat.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  // Build autonome (dossier .next/standalone) pour une image Docker légère
  output: "standalone",
  // Pas d'en-tête « X-Powered-By: Next.js » (inutile, et renseigne les curieux)
  poweredByHeader: false,
  // Pas de pastille « N » de Next.js en développement : elle se posait sur la barre de jeu (en bas à gauche)
  devIndicators: false,
  // Métadonnées (titre, description, aperçus) dans le <head> pour tous les visiteurs, pas seulement les robots
  // que Next.js reconnaît : les aperçus de liens des messageries et réseaux sociaux restent corrects.
  htmlLimitedBots: /.*/,
  // Pochettes passées par l'optimiseur d'images de Next.js : téléchargées une fois depuis Cover Art Archive
  // (qui redirige vers archive.org) ou Deezer, redimensionnées, converties en WebP, gardées 30 jours en cache
  // (.next/cache/images) et servies depuis le site, bien plus vite que depuis leur serveur d'origine.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "coverartarchive.org" },
      { protocol: "https", hostname: "archive.org" },
      { protocol: "https", hostname: "**.archive.org" },
      { protocol: "https", hostname: "**.dzcdn.net" },
    ],
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Tailles produites : vignettes (48 à 96 px) et cartes (128 à 320 px), écrans 1x et 2x
    imageSizes: [48, 64, 96, 128, 160, 192, 256],
    deviceSizes: [320, 400, 500],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
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
