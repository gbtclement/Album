import type { PoolClient } from "pg";
import { db, withTransaction } from "@/lib/db";
import { moveAlbum } from "@/lib/trades";

export class MarketError extends Error {}

export type ListingView = {
  id: string;
  seller_id: string;
  seller_pseudo: string;
  album_slug: string;
  album_title: string;
  album_artist: string;
  album_cover: string | null;
  price_coins: number | null;
  wanted_slug: string | null;
  wanted_title: string | null;
  // Cote : moyenne des 10 dernières ventes en pièces (null si aucune vente)
  cote: string | null;
  created_at: Date;
};

const MAX_PRICE = 100000;

const LISTING_SELECT = `
  select l.id, l.seller_id, s.pseudo as seller_pseudo,
         a.slug as album_slug, a.title as album_title, a.artist as album_artist, a.cover_url as album_cover,
         l.price_coins, w.slug as wanted_slug, w.title as wanted_title,
         (select round(avg(x.price_coins))::text
            from (select price_coins from market_sales ms where ms.album_id = a.id
                  order by ms.created_at desc limit 10) x) as cote,
         l.created_at
  from listings l
  join users s on s.id = l.seller_id
  join albums a on a.id = l.album_id
  left join albums w on w.id = l.wanted_album_id`;

async function albumIdBySlug(client: PoolClient | typeof db, slug: string) {
  const result = await client.query<{ id: string }>("select id from albums where slug = $1", [slug]);
  if (!result.rows[0]) throw new MarketError("Album introuvable.");
  return result.rows[0].id;
}

async function ownsAlbum(client: PoolClient | typeof db, userId: string, albumId: string) {
  const result = await client.query("select 1 from user_albums where user_id = $1 and album_id = $2 and count >= 1", [userId, albumId]);
  return (result.rowCount ?? 0) > 0;
}

export async function createListing(
  sellerId: string,
  albumSlug: string,
  mode: { kind: "coins"; price: number } | { kind: "swap"; wantedSlug: string },
) {
  const albumId = await albumIdBySlug(db, albumSlug);
  if (!(await ownsAlbum(db, sellerId, albumId))) {
    throw new MarketError("Tu ne possèdes pas cet album.");
  }

  if (mode.kind === "coins") {
    if (!Number.isInteger(mode.price) || mode.price < 1 || mode.price > MAX_PRICE) {
      throw new MarketError(`Le prix doit être entre 1 et ${MAX_PRICE} pièces.`);
    }
    await db.query(
      "insert into listings (seller_id, album_id, price_coins) values ($1, $2, $3)",
      [sellerId, albumId, mode.price],
    );
    return;
  }

  const wantedId = await albumIdBySlug(db, mode.wantedSlug);
  if (wantedId === albumId) throw new MarketError("Tu ne peux pas échanger un album contre lui-même.");
  await db.query(
    "insert into listings (seller_id, album_id, wanted_album_id) values ($1, $2, $3)",
    [sellerId, albumId, wantedId],
  );
}

export async function cancelListing(sellerId: string, listingId: string) {
  const result = await db.query(
    "update listings set status = 'cancelled', closed_at = now() where id = $1 and seller_id = $2 and status = 'active'",
    [listingId, sellerId],
  );
  if (result.rowCount === 0) throw new MarketError("Cette annonce n'est plus active.");
}

// Achat : paiement en pièces, ou troc contre un album proposé par l'acheteur. Tout ou rien.
export async function buyListing(buyerId: string, listingId: string, offeredSlug: string | null) {
  const outcome = await withTransaction(async (client) => {
    const { rows } = await client.query<{
      seller_id: string;
      album_id: string;
      price_coins: number | null;
      wanted_album_id: string | null;
    }>(
      "select seller_id, album_id, price_coins, wanted_album_id from listings where id = $1 and status = 'active' for update",
      [listingId],
    );
    const listing = rows[0];
    if (!listing) throw new MarketError("Cette annonce n'est plus active.");
    if (listing.seller_id === buyerId) throw new MarketError("Tu ne peux pas acheter ta propre annonce.");

    if (!(await ownsAlbum(client, listing.seller_id, listing.album_id))) {
      // On enregistre le retrait, puis on signale l'erreur après le commit (une erreur annulerait ce retrait)
      await client.query("update listings set status = 'cancelled', closed_at = now() where id = $1", [listingId]);
      return "orphaned" as const;
    }

    if (listing.price_coins !== null) {
      const balance = await client.query<{ coins: number }>("select coins from users where id = $1", [buyerId]);
      if (balance.rows[0].coins < listing.price_coins) throw new MarketError("Tu n'as pas assez de pièces.");

      await client.query("update users set coins = coins - $2 where id = $1", [buyerId, listing.price_coins]);
      await client.query("update users set coins = coins + $2 where id = $1", [listing.seller_id, listing.price_coins]);
      await client.query("insert into market_sales (album_id, price_coins) values ($1, $2)", [listing.album_id, listing.price_coins]);
    } else {
      if (!offeredSlug) throw new MarketError("Choisis l'album que tu proposes en échange.");
      const offeredId = await albumIdBySlug(client, offeredSlug);
      if (offeredId !== listing.wanted_album_id) throw new MarketError("Cet album n'est pas celui demandé.");
      if (!(await ownsAlbum(client, buyerId, offeredId))) throw new MarketError("Tu ne possèdes pas cet album.");

      await moveAlbum(client, buyerId, listing.seller_id, offeredId);
    }

    await moveAlbum(client, listing.seller_id, buyerId, listing.album_id);
    await client.query("update listings set status = 'sold', closed_at = now() where id = $1", [listingId]);
    return "sold" as const;
  });

  if (outcome === "orphaned") {
    throw new MarketError("Le vendeur ne possède plus cet album : l'annonce a été retirée.");
  }
}

export async function listActiveListings(): Promise<ListingView[]> {
  const result = await db.query<ListingView>(
    `${LISTING_SELECT} where l.status = 'active' order by l.created_at desc limit 200`,
  );
  return result.rows;
}

export async function listMyListings(userId: string): Promise<ListingView[]> {
  const result = await db.query<ListingView>(
    `${LISTING_SELECT} where l.status = 'active' and l.seller_id = $1 order by l.created_at desc`,
    [userId],
  );
  return result.rows;
}

// Cote d'un album, pour l'affichage sur sa fiche
export async function getAlbumCote(albumId: string) {
  const result = await db.query<{ cote: string | null; sales: string }>(
    `select (select round(avg(x.price_coins))::text
             from (select price_coins from market_sales where album_id = $1 order by created_at desc limit 10) x) as cote,
            (select count(*)::text from market_sales where album_id = $1) as sales`,
    [albumId],
  );
  return { cote: result.rows[0].cote, sales: Number(result.rows[0].sales) };
}
