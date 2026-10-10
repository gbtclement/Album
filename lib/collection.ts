import { db } from "@/lib/db";
import type { AlbumLinks, AlbumRow } from "@/lib/catalog";
import { RARITY_POINTS, type RarityTier } from "@/lib/rarity";

export type CollectionItem = {
  slug: string;
  title: string;
  artist: string;
  cover_url: string | null;
  rarity_tier: RarityTier;
  count: number;
};

export type CollectionCard = CollectionItem & {
  release_year: number | null;
  links: AlbumLinks;
  // Cote : moyenne des 10 dernières ventes en pièces (null sans vente)
  cote: number | null;
};

// Albums possédés par le joueur, éventuellement filtrés par palier
export async function getCollection(userId: string, tier: RarityTier | null): Promise<CollectionItem[]> {
  const result = await db.query<CollectionItem>(
    `select a.slug, a.title, a.artist, a.cover_url, a.rarity_tier, ua.count
     from user_albums ua
     join albums a on a.id = ua.album_id
     where ua.user_id = $1 and ua.count > 0 and ($2::text is null or a.rarity_tier = $2)
     order by ua.first_obtained_at desc`,
    [userId, tier],
  );
  return result.rows;
}

// Collection complète pour la page Collection : de quoi remplir la fiche de chaque carte
export async function getCollectionCards(userId: string): Promise<CollectionCard[]> {
  const result = await db.query<CollectionCard>(
    `select a.slug, a.title, a.artist, a.cover_url, a.rarity_tier, ua.count, a.release_year, a.links,
            (select round(avg(x.price_coins))::int
               from (select price_coins from market_sales ms where ms.album_id = a.id
                     order by ms.created_at desc limit 10) x) as cote
     from user_albums ua
     join albums a on a.id = ua.album_id
     where ua.user_id = $1 and ua.count > 0
     order by ua.first_obtained_at desc`,
    [userId],
  );
  return result.rows;
}

// Score du classement : chaque album distinct possédé vaut les points de sa rareté
export function collectionScore(items: Array<{ rarity_tier: RarityTier }>) {
  return items.reduce((sum, item) => sum + RARITY_POINTS[item.rarity_tier], 0);
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
