import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db";
import { RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { MAX_STOCK, PACK_INTERVAL_MS, PACK_RATES, PACK_SIZE, SOLO_PACK_SIZE, type PackKind } from "@/lib/pack-rules";
import { recordEvent } from "@/lib/quests";

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
  // Stock qui se recharge (10 max)
  stock: number;
  // Moment où le prochain pack sera disponible (null si le stock est plein)
  nextPackAt: Date | null;
  // Packs gagnés, sans maximum : classiques et Solo
  bonus: number;
  solo: number;
};

// Tire un palier selon les taux donnés (ceux des packs par défaut ; la pioche du jour a les siens)
export function drawTier(rates: Record<RarityTier, number> = PACK_RATES): RarityTier {
  const roll = randomInt(1_000_000) / 1_000_000;
  let cumulative = 0;
  for (const tier of RARITY_TIERS) {
    cumulative += rates[tier];
    if (roll < cumulative) return tier;
  }
  return "commun";
}

// Recharge le stock selon le temps écoulé. Pas de tâche de fond : le calcul se fait à la demande.
// Doit être appelée dans une transaction, avec le verrou posé sur la ligne du joueur.
async function rechargeStock(client: PoolClient, userId: string): Promise<PackState> {
  await client.query("insert into pack_stocks (user_id) values ($1) on conflict (user_id) do nothing", [userId]);

  const { rows } = await client.query<{ stock: number; bonus_packs: number; solo_packs: number; last_recharged_at: Date; now: Date }>(
    "select stock, bonus_packs, solo_packs, last_recharged_at, now() as now from pack_stocks where user_id = $1 for update",
    [userId],
  );
  const row = rows[0];
  const extra = { bonus: row.bonus_packs, solo: row.solo_packs };

  // Stock plein : le compteur repart de maintenant, pour qu'un pack dépensé soit recréé 5 minutes plus tard
  if (row.stock >= MAX_STOCK) {
    await client.query("update pack_stocks set last_recharged_at = now() where user_id = $1", [userId]);
    return { stock: row.stock, nextPackAt: null, ...extra };
  }

  const elapsed = row.now.getTime() - row.last_recharged_at.getTime();
  const gained = Math.min(MAX_STOCK - row.stock, Math.floor(elapsed / PACK_INTERVAL_MS));
  if (gained <= 0) {
    return { stock: row.stock, nextPackAt: new Date(row.last_recharged_at.getTime() + PACK_INTERVAL_MS), ...extra };
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
    ...extra,
  };
}

export async function getPackState(userId: string): Promise<PackState> {
  return withTransaction((client) => rechargeStock(client, userId));
}

// Ajoute des packs gagnés à la réserve du joueur, dans la transaction de la récompense
export async function grantPacks(client: PoolClient, userId: string, packs: { classic?: number; solo?: number }) {
  const classic = packs.classic ?? 0;
  const solo = packs.solo ?? 0;
  if (classic <= 0 && solo <= 0) return;
  await client.query(
    `insert into pack_stocks (user_id, bonus_packs, solo_packs) values ($1, $2, $3)
     on conflict (user_id) do update set bonus_packs = pack_stocks.bonus_packs + $2, solo_packs = pack_stocks.solo_packs + $3`,
    [userId, classic, solo],
  );
}

// Packs classiques disponibles : le stock qui se recharge plus les packs gagnés
export function classicAvailable(state: PackState) {
  return state.stock + state.bonus;
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

// Ouvre un pack : consomme un pack, tire les cartes et les ajoute à la collection.
// Un pack classique se prend d'abord dans le stock qui se recharge, puis dans les packs gagnés.
export async function openPack(userId: string, kind: PackKind = "classic"): Promise<{ cards: PackCard[]; state: PackState }> {
  return withTransaction(async (client) => {
    const before = await rechargeStock(client, userId);
    // Seuls les packs du stock qui se recharge comptent pour les quêtes « Ouvre N packs » :
    // les packs gagnés (quêtes, succès, collections, pioche) et les Solo n'en font pas partie
    const fromStock = kind === "classic" && before.stock >= 1;
    if (kind === "solo") {
      if (before.solo < 1) throw new PackError("Tu n'as plus de pack Solo. Les quêtes en rapportent.");
      await client.query("update pack_stocks set solo_packs = solo_packs - 1 where user_id = $1", [userId]);
    } else if (before.stock >= 1) {
      await client.query("update pack_stocks set stock = stock - 1 where user_id = $1", [userId]);
    } else if (before.bonus >= 1) {
      await client.query("update pack_stocks set bonus_packs = bonus_packs - 1 where user_id = $1", [userId]);
    } else {
      throw new PackError("Tu n'as plus de pack disponible. Le prochain arrive bientôt.");
    }

    const cards: PackCard[] = [];
    const albumIds: string[] = [];
    const size = kind === "solo" ? SOLO_PACK_SIZE : PACK_SIZE;
    for (let i = 0; i < size; i++) {
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

    // Progression des quêtes, dans la même transaction que l'ouverture
    if (fromStock) await recordEvent(client, userId, "pack_opened", 1);
    await recordEvent(client, userId, "rare_card", cards.filter((card) => card.tier !== "commun" && card.tier !== "peu_commun").length);
    await recordEvent(client, userId, "legendary_card", cards.filter((card) => card.tier === "legendaire").length);
    await recordEvent(client, userId, "new_album", cards.filter((card) => card.isNew).length);

    // Recalcul du prochain pack après la dépense (sans gain de stock : le délai vient de démarrer)
    const state = await rechargeStock(client, userId);
    return { cards, state };
  });
}
