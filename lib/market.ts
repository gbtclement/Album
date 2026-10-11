import type { PoolClient } from "pg";
import { db, withTransaction } from "@/lib/db";
import { sellerReceives } from "@/lib/market-rules";
import type { RarityTier } from "@/lib/rarity";
import { moveAlbum } from "@/lib/trades";
import { recordEvent } from "@/lib/quests";
import { isEmailVerified, VERIFIED_EMAIL_REQUIRED } from "@/lib/users";

export class MarketError extends Error {}

export type ListingView = {
  id: string;
  seller_id: string;
  seller_pseudo: string;
  album_slug: string;
  album_title: string;
  album_artist: string;
  album_cover: string | null;
  album_tier: RarityTier;
  price_coins: number | null;
  wanted_slug: string | null;
  wanted_title: string | null;
  wanted_tier: RarityTier | null;
  // Cote : moyenne des 10 dernières ventes en pièces (null si aucune vente)
  cote: string | null;
  created_at: Date;
};

const MAX_PRICE = 100000;

const LISTING_SELECT = `
  select l.id, l.seller_id, s.pseudo as seller_pseudo,
         a.slug as album_slug, a.title as album_title, a.artist as album_artist, a.cover_url as album_cover,
         a.rarity_tier as album_tier,
         l.price_coins, w.slug as wanted_slug, w.title as wanted_title, w.rarity_tier as wanted_tier,
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
  if (!(await isEmailVerified(sellerId))) throw new MarketError(VERIFIED_EMAIL_REQUIRED);
  if (mode.kind === "coins" && (!Number.isInteger(mode.price) || mode.price < 1 || mode.price > MAX_PRICE)) {
    throw new MarketError(`Le prix doit être entre 1 et ${MAX_PRICE} pièces.`);
  }

  await withTransaction(async (client) => {
    const albumId = await albumIdBySlug(client, albumSlug);

    // Verrou sur la ligne de collection : deux annonces envoyées en même temps attendent leur tour
    const owned = await client.query<{ count: number }>(
      "select count from user_albums where user_id = $1 and album_id = $2 for update",
      [sellerId, albumId],
    );
    const copies = owned.rows[0]?.count ?? 0;
    if (copies < 1) throw new MarketError("Tu ne possèdes pas cet album.");

    // Une annonce par exemplaire possédé, pas plus
    const listed = await client.query<{ total: number }>(
      "select count(*)::int as total from listings where seller_id = $1 and album_id = $2 and status = 'active'",
      [sellerId, albumId],
    );
    if (listed.rows[0].total >= copies) {
      throw new MarketError(
        copies === 1
          ? "Cet album est déjà en vente : retire l'annonce existante avant d'en créer une autre."
          : `Tes ${copies} exemplaires de cet album sont déjà en vente.`,
      );
    }

    if (mode.kind === "coins") {
      await client.query(
        "insert into listings (seller_id, album_id, price_coins) values ($1, $2, $3)",
        [sellerId, albumId, mode.price],
      );
      return;
    }

    const wantedId = await albumIdBySlug(client, mode.wantedSlug);
    if (wantedId === albumId) throw new MarketError("Tu ne peux pas échanger un album contre lui-même.");
    await client.query(
      "insert into listings (seller_id, album_id, wanted_album_id) values ($1, $2, $3)",
      [sellerId, albumId, wantedId],
    );
  });
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
  if (!(await isEmailVerified(buyerId))) throw new MarketError(VERIFIED_EMAIL_REQUIRED);
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
      // Le vendeur reçoit le prix moins la taxe du marché (5 %), qui disparaît du jeu
      await client.query("update users set coins = coins + $2 where id = $1", [listing.seller_id, sellerReceives(listing.price_coins)]);
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
    await recordEvent(client, buyerId, "trade", 1);
    await recordEvent(client, listing.seller_id, "trade", 1);
    return "sold" as const;
  });

  if (outcome === "orphaned") {
    throw new MarketError("Le vendeur ne possède plus cet album : l'annonce a été retirée.");
  }
}

export const MARKET_SORTS = ["recentes", "prix-croissant", "prix-decroissant", "rarete"] as const;
export type MarketSort = (typeof MARKET_SORTS)[number];
export const MARKET_PAGE_SIZE = 24;

// Tri en SQL : les trocs (sans prix) passent après les ventes en pièces quand on trie par prix
const SORT_SQL: Record<MarketSort, string> = {
  recentes: "l.created_at desc, l.id",
  "prix-croissant": "l.price_coins asc nulls last, l.created_at desc, l.id",
  "prix-decroissant": "l.price_coins desc nulls last, l.created_at desc, l.id",
  rarete: "array_position(array['legendaire','epique','rare','peu_commun','commun'], a.rarity_tier::text), l.created_at desc, l.id",
};

// Une page d'annonces des autres joueurs, triée et filtrée par la base (seule la page affichée est chargée)
export async function listMarketPage(options: {
  excludeSellerId: string;
  tier: RarityTier | null;
  sort: MarketSort;
  page: number;
}): Promise<{ listings: ListingView[]; total: number }> {
  const where = "l.status = 'active' and l.seller_id <> $1 and ($2::text is null or a.rarity_tier::text = $2)";
  const offset = (Math.max(1, options.page) - 1) * MARKET_PAGE_SIZE;
  const [rows, count] = await Promise.all([
    db.query<ListingView>(`${LISTING_SELECT} where ${where} order by ${SORT_SQL[options.sort]} limit $3 offset $4`, [
      options.excludeSellerId,
      options.tier,
      MARKET_PAGE_SIZE,
      offset,
    ]),
    db.query<{ total: number }>(
      `select count(*)::int as total from listings l join albums a on a.id = l.album_id where ${where}`,
      [options.excludeSellerId, options.tier],
    ),
  ]);
  return { listings: rows.rows, total: count.rows[0].total };
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
