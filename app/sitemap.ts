import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";

// Lu à chaque requête : la base n'est pas joignable pendant le build
export const dynamic = "force-dynamic";

// Plan du site : pages publiques et une URL par album du catalogue
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  const albums = await db.query<{ slug: string; updated_at: Date }>(
    "select slug, updated_at from albums where cover_url is not null order by updated_at desc",
  );

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/documentation"), changeFrequency: "monthly", priority: 0.3 },
    ...albums.rows.map((album) => ({
      url: absoluteUrl(`/album/${album.slug}`),
      lastModified: album.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
