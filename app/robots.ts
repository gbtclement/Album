import type { MetadataRoute } from "next";
import { absoluteUrl, indexingEnabled, PRIVATE_PATHS } from "@/lib/seo";

// Lu à chaque requête (variables fournies au lancement du conteneur, pas au build)
export const dynamic = "force-dynamic";

// Tant que SEO_INDEXING n'est pas "true" (développement, préproduction), aucun moteur ne doit indexer le site.
// En production : tout est ouvert sauf les pages des joueurs, les liens reçus par e-mail et l'API.
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!indexingEnabled()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl(""),
  };
}
