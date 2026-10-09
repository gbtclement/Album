import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db";
import { RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { MAX_STOCK, PACK_INTERVAL_MS, PACK_RATES, PACK_SIZE } from "@/lib/pack-rules";

export class PackError extends Error {}

export type PackCard = {
  slug: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  tier: RarityTier;
  isNew: boolean;
};

export type PackState = {
  stock: number;
  // Moment où le prochain pack sera disponible (null si le stock est plein)
  nextPackAt: Date | null;
};

export function drawTier(): RarityTier {
  const roll = randomInt(1_000_000) / 1_000_000;
  let cumulative = 0;
  for (const tier of RARITY_TIERS) {
    cumulative += PACK_RATES[tier];
    if (roll < cumulative) return tier;
  }
  return "commun";
}

// Recharge le stock selon le temps écoulé. Pas de tâche de fond : le calcul se fait à la demande.
// Doit être appelée dans une transaction, avec le verrou posé sur la ligne du joueur.
async function rechargeStock(client: PoolClient, userId: string): Promise<PackState> {
  await client.query("insert into pack_stocks (user_id) values ($1) on conflict (user_id) do nothing", [userId]);

  const { rows } = await client.query<{ stock: number; last_recharged_at: Date; now: Date }>(
    "select stock, last_recharged_at, now() as now from pack_stocks where user_id = $1 for update",
    [userId],
  );
  const row = rows[0];

  // Stock plein : le compteur repart de maintenant, pour qu'un pack dépensé soit recréé 5 minutes plus tard
  if (row.stock >= MAX_STOCK) {
    await client.query("update pack_stocks set last_recharged_at = now() where user_id = $1", [userId]);
    return { stock: row.stock, nextPackAt: null };
  }

  const elapsed = row.now.getTime() - row.last_recharged_at.getTime();
  const gained = Math.min(MAX_STOCK - row.stock, Math.floor(elapsed / PACK_INTERVAL_MS));
  if (gained <= 0) {
    return { stock: row.stock, nextPackAt: new Date(row.last_recharged_at.getTime() + PACK_INTERVAL_MS) };
  }

  const stock = row.stock + gained;
  const lastRechargedAt =
    stock >= MAX_STOCK ? row.now : new Date(row.last_recharged_at.getTime() + gained * PACK_INTERVAL_MS);
  await client.query("update pack_stocks set stock = $2, last_recharged_at = $3 where user_id = $1", [
    userId,
    stock,
    lastRechargedAt,
  ]);

  return {
    stock,
    nextPackAt: stock >= MAX_STOCK ? null : new Date(lastRechargedAt.getTime() + PACK_INTERVAL_MS),
  };
}

export async function getPackState(userId: string): Promise<PackState> {
  return withTransaction((client) => rechargeStock(client, userId));
}

// Choisit un album au hasard dans le palier demandé ; si le palier est vide, on descend puis on monte
async function pickAlbum(client: PoolClient, tier: RarityTier) {
  const index = RARITY_TIERS.indexOf(tier);
  const order = [
    ...RARITY_TIERS.slice(0, index + 1).reverse(),
    ...RARITY_TIERS.slice(index + 1),
  ];

  for (const candidate of order) {
    const { rows } = await client.query<{ id: string; slug: string; title: string; artist: string; cover_url: string | null; rarity_tier: RarityTier }>(
      "select id, slug, title, artist, cover_url, rarity_tier from albums where rarity_tier = $1 and cover_url is not null order by random() limit 1",
      [candidate],
    );
    if (rows[0]) return rows[0];
  }
  throw new PackError("Le catalogue est vide : aucun album ne peut être tiré.");
}

// Ouvre un pack : consomme un pack, tire les cartes et les ajoute à la collection
export async function openPack(userId: string): Promise<{ cards: PackCard[]; state: PackState }> {
  return withTransaction(async (client) => {
    const before = await rechargeStock(client, userId);
    if (before.stock < 1) {
      throw new PackError("Tu n'as plus de pack disponible. Le prochain arrive bientôt.");
    }

    const stock = before.stock - 1;
    await client.query("update pack_stocks set stock = $2 where user_id = $1", [userId, stock]);

    const cards: PackCard[] = [];
    const albumIds: string[] = [];
    for (let i = 0; i < PACK_SIZE; i++) {
      const album = await pickAlbum(client, drawTier());
      albumIds.push(album.id);
      // xmax = 0 signifie que la ligne vient d'être insérée : c'est un nouvel album pour le joueur
      const { rows } = await client.query<{ is_new: boolean }>(
        `insert into user_albums (user_id, album_id, count) values ($1, $2, 1)
         on conflict (user_id, album_id) do update set count = user_albums.count + 1
         returning (xmax = 0) as is_new`,
        [userId, album.id],
      );
      cards.push({
        slug: album.slug,
        title: album.title,
        artist: album.artist,
        coverUrl: album.cover_url,
        tier: album.rarity_tier,
        isNew: rows[0].is_new,
      });
    }

    await client.query("insert into pack_openings (user_id, album_ids) values ($1, $2)", [userId, albumIds]);

    // Recalcul du prochain pack après la dépense (sans gain de stock : le délai vient de démarrer)
    const state = await rechargeStock(client, userId);
    return { cards, state };
  });
}
