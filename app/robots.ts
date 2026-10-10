import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { absoluteUrl, indexingEnabled } from "@/lib/seo";

// Tant que SEO_INDEXING n'est pas "true", aucun moteur de recherche ne doit indexer le site
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();

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
