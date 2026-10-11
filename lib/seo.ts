// Réglages SEO. Les valeurs viennent de .env :
//   PUBLIC_BASE_URL : adresse publique du site (URLs canoniques, sitemap)
//   SEO_INDEXING    : "true" pour autoriser les moteurs de recherche (à activer seulement une fois le domaine en ligne)

export function siteUrl() {
  return (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function indexingEnabled() {
  return process.env.SEO_INDEXING === "true";
}

// Pages que les moteurs ne doivent pas explorer : espace des joueurs (redirigé vers la connexion de toute façon),
// pages ouvertes depuis un e-mail, outils de développement et API
export const PRIVATE_PATHS = [
  "/packs",
  "/collection",
  "/amis",
  "/echanges",
  "/marche",
  "/bourse",
  "/classement",
  "/quetes",
  "/passe",
  "/premium",
  "/pioche",
  "/profil",
  "/verifier-email",
  "/mot-de-passe-oublie",
  "/nouveau-mot-de-passe",
  "/apercu-emails",
  "/api/",
];

export function absoluteUrl(path: string) {
  return `${siteUrl()}${path}`;
}

// Échappe "<" pour qu'un contenu JSON-LD ne puisse pas fermer la balise <script>
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
