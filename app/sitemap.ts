import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";

// Lu à chaque requête : la base n'est pas joignable pendant le build
export const dynamic = "force-dynamic";

// Plan du site : pages publiques et une URL par album du catalogue (limite d'un plan : 50 000 adresses)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const albums = await db.query<{ slug: string; updated_at: Date }>(
    "select slug, updated_at from albums where cover_url is not null order by lastfm_playcount desc nulls last limit 49000",
  );
  const latest = albums.rows.reduce<Date | undefined>((max, album) => (!max || album.updated_at > max ? album.updated_at : max), undefined);

  return [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/inscription"), changeFrequency: "yearly", priority: 0.6 },
    { url: absoluteUrl("/connexion"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/documentation"), changeFrequency: "monthly", priority: 0.2 },
    ...["/mentions-legales", "/confidentialite", "/cgu", "/cgv"].map((path) => ({ url: absoluteUrl(path), changeFrequency: "yearly" as const, priority: 0.1 })),
    ...albums.rows.map((album) => ({
      url: absoluteUrl(`/album/${album.slug}`),
      lastModified: album.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
