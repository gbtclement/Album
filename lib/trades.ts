import type { PoolClient } from "pg";
import { db, withTransaction } from "@/lib/db";
import { areFriends } from "@/lib/friends";
import { recordEvent } from "@/lib/quests";
import type { RarityTier } from "@/lib/rarity";
import { isEmailVerified, VERIFIED_EMAIL_REQUIRED } from "@/lib/users";

export class TradeError extends Error {}

export type TradeSide = {
  albumSlug: string | null;
  coins: number;
};

export type TradeView = {
  id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  proposer_id: string;
  proposer_pseudo: string;
  receiver_id: string;
  receiver_pseudo: string;
  offer_slug: string | null;
  offer_title: string | null;
  offer_cover: string | null;
  offer_tier: RarityTier | null;
  offer_coins: number;
  request_slug: string | null;
  request_title: string | null;
  request_cover: string | null;
  request_tier: RarityTier | null;
  request_coins: number;
  created_at: Date;
  resolved_at: Date | null;
};

const TRADE_SELECT = `
  select t.id, t.status, t.proposer_id, p.pseudo as proposer_pseudo,
         t.receiver_id, r.pseudo as receiver_pseudo,
         oa.slug as offer_slug, oa.title as offer_title, oa.cover_url as offer_cover, oa.rarity_tier as offer_tier, t.offer_coins,
         ra.slug as request_slug, ra.title as request_title, ra.cover_url as request_cover, ra.rarity_tier as request_tier, t.request_coins,
         t.created_at, t.resolved_at
  from trades t
  join users p on p.id = t.proposer_id
  join users r on r.id = t.receiver_id
  left join albums oa on oa.id = t.offer_album_id
  left join albums ra on ra.id = t.request_album_id`;

const MAX_COINS = 100000;

// Vérifie qu'un joueur possède l'album (si demandé) et les pièces annoncées
async function assertCanGive(client: PoolClient, userId: string, albumId: string | null, coins: number, label: string) {
  if (albumId) {
    const owned = await client.query("select 1 from user_albums where user_id = $1 and album_id = $2 and count >= 1", [userId, albumId]);
    if (owned.rowCount === 0) throw new TradeError(`${label} : l'album n'est plus dans ta collection.`);
  }
  if (coins > 0) {
    const balance = await client.query<{ coins: number }>("select coins from users where id = $1", [userId]);
    if (balance.rows[0].coins < coins) throw new TradeError(`${label} : pas assez de pièces.`);
  }
}

async function albumIdFromSlug(client: PoolClient, slug: string | null): Promise<string | null> {
  if (!slug) return null;
  const result = await client.query<{ id: string }>("select id from albums where slug = $1", [slug]);
  if (!result.rows[0]) throw new TradeError("Album introuvable.");
  return result.rows[0].id;
}

function validateSide(side: TradeSide, label: string) {
  if (!Number.isInteger(side.coins) || side.coins < 0 || side.coins > MAX_COINS) {
    throw new TradeError(`${label} : le nombre de pièces doit être entre 0 et ${MAX_COINS}.`);
  }
  if (!side.albumSlug && side.coins === 0) {
    throw new TradeError(`${label} : ajoute au moins un album ou des pièces.`);
  }
}

export async function createTrade(proposerId: string, receiverId: string, offer: TradeSide, request: TradeSide) {
  validateSide(offer, "Ton offre");
  validateSide(request, "Ce que tu demandes");
  if (!(await isEmailVerified(proposerId))) throw new TradeError(VERIFIED_EMAIL_REQUIRED);
  if (!(await isEmailVerified(receiverId))) {
    throw new TradeError("Ton ami n'a pas encore confirmé son adresse e-mail : il ne peut pas encore échanger.");
  }

  return withTransaction(async (client) => {
    if (!(await areFriends(proposerId, receiverId))) {
      throw new TradeError("Tu ne peux échanger qu'avec tes amis.");
    }

    const offerAlbumId = await albumIdFromSlug(client, offer.albumSlug);
    const requestAlbumId = await albumIdFromSlug(client, request.albumSlug);
    await assertCanGive(client, proposerId, offerAlbumId, offer.coins, "Ton offre");
    await assertCanGive(client, receiverId, requestAlbumId, request.coins, "Ce que tu demandes");

    await client.query(
      `insert into trades (proposer_id, receiver_id, offer_album_id, offer_coins, request_album_id, request_coins)
       values ($1, $2, $3, $4, $5, $6)`,
      [proposerId, receiverId, offerAlbumId, offer.coins, requestAlbumId, request.coins],
    );
  });
}

// Déplace un exemplaire d'album d'un joueur à un autre
export async function moveAlbum(client: PoolClient, fromId: string, toId: string, albumId: string) {
  // Dernier exemplaire : la ligne disparaît. Sinon on décrémente (count doit rester >= 1).
  const removed = await client.query(
    "delete from user_albums where user_id = $1 and album_id = $2 and count = 1",
    [fromId, albumId],
  );
  if (removed.rowCount === 0) {
    await client.query(
      "update user_albums set count = count - 1 where user_id = $1 and album_id = $2",
      [fromId, albumId],
    );
  }
  await client.query(
    `insert into user_albums (user_id, album_id, count) values ($1, $2, 1)
     on conflict (user_id, album_id) do update set count = user_albums.count + 1`,
    [toId, albumId],
  );
}

// Accepte un échange : tout ou rien. Les lignes sont verrouillées pour éviter les doubles validations.
export async function acceptTrade(receiverId: string, tradeId: string) {
  if (!(await isEmailVerified(receiverId))) throw new TradeError(VERIFIED_EMAIL_REQUIRED);
  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      proposer_id: string;
      receiver_id: string;
      offer_album_id: string | null;
      offer_coins: number;
      request_album_id: string | null;
      request_coins: number;
    }>(
      `select proposer_id, receiver_id, offer_album_id, offer_coins, request_album_id, request_coins
       from trades where id = $1 and receiver_id = $2 and status = 'pending' for update`,
      [tradeId, receiverId],
    );
    const trade = rows[0];
    if (!trade) throw new TradeError("Cet échange n'existe plus ou a déjà été traité.");

    // Les deux joueurs ont pu bouger leurs cartes depuis la proposition
    await assertCanGive(client, trade.proposer_id, trade.offer_album_id, trade.offer_coins, "L'offre");
    await assertCanGive(client, trade.receiver_id, trade.request_album_id, trade.request_coins, "La demande");

    if (trade.offer_album_id) await moveAlbum(client, trade.proposer_id, trade.receiver_id, trade.offer_album_id);
    if (trade.request_album_id) await moveAlbum(client, trade.receiver_id, trade.proposer_id, trade.request_album_id);

    await client.query("update users set coins = coins - $2 + $3 where id = $1", [trade.proposer_id, trade.offer_coins, trade.request_coins]);
    await client.query("update users set coins = coins - $2 + $3 where id = $1", [trade.receiver_id, trade.request_coins, trade.offer_coins]);

    await client.query("update trades set status = 'accepted', resolved_at = now() where id = $1", [tradeId]);
    // Seul un échange où un album change de mains fait avancer les quêtes :
    // sinon deux amis pourraient s'échanger 1 pièce contre 1 pièce pour valider la quête sans rien faire.
    if (trade.offer_album_id || trade.request_album_id) {
      await recordEvent(client, trade.proposer_id, "trade", 1);
      await recordEvent(client, trade.receiver_id, "trade", 1);
    }
  });
}

// Refuser (par le destinataire) ou annuler (par le proposeur)
export async function closeTrade(userId: string, tradeId: string, action: "decline" | "cancel") {
  const column = action === "decline" ? "receiver_id" : "proposer_id";
  const status = action === "decline" ? "declined" : "cancelled";
  const result = await db.query(
    `update trades set status = $3, resolved_at = now()
     where id = $1 and ${column} = $2 and status = 'pending'`,
    [tradeId, userId, status],
  );
  if (result.rowCount === 0) throw new TradeError("Cet échange n'existe plus ou a déjà été traité.");
}

export async function listTrades(userId: string) {
  const [incoming, outgoing, history] = await Promise.all([
    db.query<TradeView>(`${TRADE_SELECT} where t.receiver_id = $1 and t.status = 'pending' order by t.created_at desc`, [userId]),
    db.query<TradeView>(`${TRADE_SELECT} where t.proposer_id = $1 and t.status = 'pending' order by t.created_at desc`, [userId]),
    db.query<TradeView>(
      `${TRADE_SELECT} where (t.proposer_id = $1 or t.receiver_id = $1) and t.status <> 'pending'
       order by t.resolved_at desc limit 30`,
      [userId],
    ),
  ]);
  return { incoming: incoming.rows, outgoing: outgoing.rows, history: history.rows };
}
