import { db } from "@/lib/db";
import type { AlbumRow } from "@/lib/catalog";
import type { RarityTier } from "@/lib/rarity";

export type CollectionItem = {
  slug: string;
  title: string;
  artist: string;
  cover_url: string | null;
  rarity_tier: RarityTier;
  count: number;
};

// Albums possédés par le joueur, éventuellement filtrés par palier
export async function getCollection(userId: string, tier: RarityTier | null): Promise<CollectionItem[]> {
  const result = await db.query<CollectionItem>(
    `select a.slug, a.title, a.artist, a.cover_url, a.rarity_tier, ua.count
     from user_albums ua
     join albums a on a.id = ua.album_id
     where ua.user_id = $1 and ($2::text is null or a.rarity_tier = $2)
     order by ua.first_obtained_at desc`,
    [userId, tier],
  );
  return result.rows;
}

// Nombre d'exemplaires d'un album pour un joueur (0 si absent)
export async function getOwnedCount(userId: string, albumId: string): Promise<number> {
  const result = await db.query<{ count: number }>(
    "select count from user_albums where user_id = $1 and album_id = $2",
    [userId, albumId],
  );
  return result.rows[0]?.count ?? 0;
}

export async function getCollectionTotals(userId: string) {
  const result = await db.query<{ owned: string; total: string }>(
    `select
       (select count(*) from user_albums where user_id = $1) as owned,
       (select count(*) from albums) as total`,
    [userId],
  );
  return { owned: Number(result.rows[0].owned), total: Number(result.rows[0].total) };
}

export async function getAlbumsCount() {
  const result = await db.query<{ total: string }>("select count(*) as total from albums");
  return Number(result.rows[0].total);
}

export type { AlbumRow };
