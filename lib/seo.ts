// Réglages SEO. Les valeurs viennent de .env :
//   PUBLIC_BASE_URL : adresse publique du site (URLs canoniques, sitemap)
//   SEO_INDEXING    : "true" pour autoriser les moteurs de recherche (à activer seulement une fois le domaine en ligne)

export function siteUrl() {
  return (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function indexingEnabled() {
  return process.env.SEO_INDEXING === "true";
}

export function absoluteUrl(path: string) {
  return `${siteUrl()}${path}`;
}

// Échappe "<" pour qu'un contenu JSON-LD ne puisse pas fermer la balise <script>
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
