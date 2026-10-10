import type { MetadataRoute } from "next";
import { absoluteUrl, indexingEnabled } from "@/lib/seo";

// Lu à chaque requête (variables fournies au lancement du conteneur, pas au build)
export const dynamic = "force-dynamic";

// Tant que SEO_INDEXING n'est pas "true", aucun moteur de recherche ne doit indexer le site
export default async function robots(): Promise<MetadataRoute.Robots> {

  if (!indexingEnabled()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/packs", "/collection", "/amis", "/echanges", "/marche", "/bourse", "/classement", "/quetes", "/profil", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
