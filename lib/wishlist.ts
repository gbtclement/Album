import { db } from "@/lib/db";
import { craftCost } from "@/lib/dust-rules";
import type { RarityTier } from "@/lib/rarity";

// Liste de souhaits (lot WISH1) : les albums qu'un joueur cherche. Un album obtenu reste dans la liste
// (affiché « obtenu ») mais ne compte plus dans la pastille du Marché ni dans le filtre « Mes souhaits ».

export class WishlistError extends Error {}

// Au-delà, la liste ne sert plus à repérer les albums vraiment recherchés
export const MAX_WISHES = 100;

export type Wish = {
  slug: string;
  title: string;
  artist: string;
  cover_url: string | null;
  rarity_tier: RarityTier;
  owned: boolean;
  // Annonces actives des autres joueurs, et le prix le plus bas en pièces
  on_sale: number;
  lowest_price: number | null;
  craft_cost: number;
};

// Ajoute ou retire un album ; renvoie true s'il est maintenant dans la liste
export async function toggleWish(userId: string, slug: string): Promise<boolean> {
  const album = await db.query<{ id: string }>("select id from albums where slug = $1", [slug]);
  if (!album.rows[0]) throw new WishlistError("Album introuvable.");
  const albumId = album.rows[0].id;

  const removed = await db.query("delete from wishlist where user_id = $1 and album_id = $2", [userId, albumId]);
  if (removed.rowCount) return false;

  // Le compte et l'ajout dans une même requête : deux clics simultanés ne dépassent pas le maximum
  const added = await db.query(
    `insert into wishlist (user_id, album_id)
     select $1, $2 where (select count(*) from wishlist where user_id = $1) < $3
     on conflict do nothing`,
    [userId, albumId, MAX_WISHES],
  );
  if (!added.rowCount) throw new WishlistError(`Ta liste de souhaits est pleine (${MAX_WISHES} albums) : retires-en un d'abord.`);
  return true;
}

export async function isWished(userId: string, albumId: string) {
  const { rowCount } = await db.query("select 1 from wishlist where user_id = $1 and album_id = $2", [userId, albumId]);
  return (rowCount ?? 0) > 0;
}

export async function getWishlist(userId: string): Promise<Wish[]> {
  const { rows } = await db.query<Omit<Wish, "craft_cost">>(
    `select a.slug, a.title, a.artist, a.cover_url, a.rarity_tier,
            exists (select 1 from user_albums ua where ua.user_id = w.user_id and ua.album_id = a.id) as owned,
            (select count(*) from listings l where l.album_id = a.id and l.status = 'active' and l.seller_id <> w.user_id)::int as on_sale,
            (select min(l.price_coins) from listings l where l.album_id = a.id and l.status = 'active' and l.seller_id <> w.user_id) as lowest_price
     from wishlist w join albums a on a.id = w.album_id
     where w.user_id = $1
     order by owned, w.created_at desc`,
    [userId],
  );
  return rows.map((row) => ({ ...row, craft_cost: craftCost(row.rarity_tier) }));
}

// Pastille du Marché : albums souhaités, pas encore possédés, mis en vente par un autre joueur
export async function countWishesOnSale(userId: string) {
  const { rows } = await db.query<{ total: number }>(
    `select count(*)::int as total from wishlist w
     where w.user_id = $1
       and not exists (select 1 from user_albums ua where ua.user_id = w.user_id and ua.album_id = w.album_id)
       and exists (select 1 from listings l where l.album_id = w.album_id and l.status = 'active' and l.seller_id <> w.user_id)`,
    [userId],
  );
  return rows[0].total;
}
