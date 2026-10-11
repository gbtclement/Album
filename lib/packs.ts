import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db";
import { RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { GUARANTEED_TIER, maxStock, PACK_INTERVAL_MS, PACK_RATES, packSize, type PackKind } from "@/lib/pack-rules";
import { addPassXp } from "@/lib/pass";
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
  // Stock qui se recharge, jusqu'à max (10, ou 15 pour un compte premium)
  stock: number;
  max: number;
  // Moment où le prochain pack sera disponible (null si le stock est plein)
  nextPackAt: Date | null;
  // Packs gagnés, sans maximum : classiques, Solo, Épique et Légendaire
  bonus: number;
  solo: number;
  epic: number;
  legendary: number;
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

  const { rows } = await client.query<{
    stock: number; bonus_packs: number; solo_packs: number; epic_packs: number; legendary_packs: number;
    last_recharged_at: Date; now: Date; premium: boolean;
  }>(
    `select ps.stock, ps.bonus_packs, ps.solo_packs, ps.epic_packs, ps.legendary_packs, ps.last_recharged_at, now() as now,
            coalesce(u.premium_until > now(), false) as premium
     from pack_stocks ps join users u on u.id = ps.user_id
     where ps.user_id = $1 for update of ps`,
    [userId],
  );
  const row = rows[0];
  // Stock maximum : 15 pour un compte premium, 10 sinon. Un premium expiré garde ses packs au-dessus de 10.
  const max = maxStock(row.premium);
  const extra = { bonus: row.bonus_packs, solo: row.solo_packs, epic: row.epic_packs, legendary: row.legendary_packs, max };

  // Stock plein : le compteur repart de maintenant, pour qu'un pack dépensé soit recréé 5 minutes plus tard
  if (row.stock >= max) {
    await client.query("update pack_stocks set last_recharged_at = now() where user_id = $1", [userId]);
    return { stock: row.stock, nextPackAt: null, ...extra };
  }

  const elapsed = row.now.getTime() - row.last_recharged_at.getTime();
  const gained = Math.min(max - row.stock, Math.floor(elapsed / PACK_INTERVAL_MS));
  if (gained <= 0) {
    return { stock: row.stock, nextPackAt: new Date(row.last_recharged_at.getTime() + PACK_INTERVAL_MS), ...extra };
  }

  const stock = row.stock + gained;
  const lastRechargedAt =
    stock >= max ? row.now : new Date(row.last_recharged_at.getTime() + gained * PACK_INTERVAL_MS);
  await client.query("update pack_stocks set stock = $2, last_recharged_at = $3 where user_id = $1", [
    userId,
    stock,
    lastRechargedAt,
  ]);

  return {
    stock,
    nextPackAt: stock >= max ? null : new Date(lastRechargedAt.getTime() + PACK_INTERVAL_MS),
    ...extra,
  };
}

export async function getPackState(userId: string): Promise<PackState> {
  return withTransaction((client) => rechargeStock(client, userId));
}

// Ajoute des packs gagnés à la réserve du joueur, dans la transaction de la récompense
export async function grantPacks(
  client: PoolClient,
  userId: string,
  packs: { classic?: number; solo?: number; epic?: number; legendary?: number },
) {
  const values = [packs.classic ?? 0, packs.solo ?? 0, packs.epic ?? 0, packs.legendary ?? 0];
  if (values.every((value) => value <= 0)) return;
  await client.query(
    `insert into pack_stocks (user_id, bonus_packs, solo_packs, epic_packs, legendary_packs) values ($1, $2, $3, $4, $5)
     on conflict (user_id) do update set bonus_packs = pack_stocks.bonus_packs + $2, solo_packs = pack_stocks.solo_packs + $3,
       epic_packs = pack_stocks.epic_packs + $4, legendary_packs = pack_stocks.legendary_packs + $5`,
    [userId, ...values],
  );
}

// Réserves des packs gagnés autres que classiques : colonne et message quand il n'y en a plus
const RESERVES = {
  solo: { column: "solo_packs", empty: "Tu n'as plus de pack Solo. Les quêtes en rapportent." },
  epic: { column: "epic_packs", empty: "Tu n'as plus de pack Épique." },
  legendary: { column: "legendary_packs", empty: "Tu n'as plus de pack Légendaire." },
} as const;

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
    if (kind !== "classic") {
      const reserve = RESERVES[kind];
      if (before[kind] < 1) throw new PackError(reserve.empty);
      await client.query(`update pack_stocks set ${reserve.column} = ${reserve.column} - 1 where user_id = $1`, [userId]);
    } else if (before.stock >= 1) {
      await client.query("update pack_stocks set stock = stock - 1 where user_id = $1", [userId]);
    } else if (before.bonus >= 1) {
      await client.query("update pack_stocks set bonus_packs = bonus_packs - 1 where user_id = $1", [userId]);
    } else {
      throw new PackError("Tu n'as plus de pack disponible. Le prochain arrive bientôt.");
    }

    const cards: PackCard[] = [];
    const albumIds: string[] = [];
    // Packs Épique et Légendaire : la première carte est tirée dans le palier garanti
    const guaranteed = GUARANTEED_TIER[kind];
    for (let i = 0; i < packSize(kind); i++) {
      const album = await pickAlbum(client, i === 0 && guaranteed ? guaranteed : drawTier());
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
    // Quêtes « Ouvre N packs » : seuls les packs de 5 cartes comptent (stock ou gagnés), pas les Solo
    if (kind !== "solo") await recordEvent(client, userId, "pack_opened", 1);
    await recordEvent(client, userId, "rare_card", cards.filter((card) => card.tier !== "commun" && card.tier !== "peu_commun").length);
    await recordEvent(client, userId, "legendary_card", cards.filter((card) => card.tier === "legendaire").length);
    await recordEvent(client, userId, "new_album", cards.filter((card) => card.isNew).length);
    // Passe de combat : chaque carte rapporte l'XP de sa rareté, quel que soit le pack
    await addPassXp(client, userId, cards.map((card) => card.tier));

    // Recalcul du prochain pack après la dépense (sans gain de stock : le délai vient de démarrer)
    const state = await rechargeStock(client, userId);
    return { cards, state };
  });
}
