import type { PoolClient } from "pg";
import { db, withTransaction } from "@/lib/db";
import { grantPacks } from "@/lib/packs";
import { PASS_REWARDS, PASS_TRACKS, passLevel, seasonEnd, xpForCards, type PassReward, type PassTrack } from "@/lib/pass-rules";
import { periodStart } from "@/lib/quests";
import type { RarityTier } from "@/lib/rarity";

// Passe de combat (lot P2) : chaque carte obtenue rapporte de l'XP, l'XP fait monter des paliers,
// chaque palier se réclame une fois par ligne (gratuite, premium). Une saison = un mois (UTC).
// Les paliers atteints et non réclamés d'une saison passée sont versés automatiquement.

export class PassError extends Error {}

export function currentSeason(now: Date = new Date()) {
  return periodStart("monthly", now);
}

// Ajoute l'XP des cartes obtenues. Doit être appelée dans la transaction qui donne les cartes.
export async function addPassXp(client: PoolClient, userId: string, tiers: RarityTier[]) {
  const xp = xpForCards(tiers);
  if (xp <= 0) return;
  await client.query(
    `insert into pass_progress (user_id, season, xp) values ($1, $2, $3)
     on conflict (user_id, season) do update set xp = pass_progress.xp + excluded.xp`,
    [userId, currentSeason(), xp],
  );
}

export type PassState = {
  season: string;
  endsAt: Date;
  xp: number;
  level: number;
  premium: boolean;
  // Paliers réclamés, sous la forme "palier:ligne" (ex. "3:free")
  claimed: Set<string>;
  // Récompenses réclamables maintenant (ligne premium comptée seulement pour un joueur premium)
  claimable: number;
};

export const claimKey = (tier: number, track: PassTrack) => `${tier}:${track}`;

export async function getPassState(userId: string): Promise<PassState> {
  const season = currentSeason();
  const [progress, claims, premium] = await Promise.all([
    db.query<{ xp: number }>("select xp from pass_progress where user_id = $1 and season = $2", [userId, season]),
    db.query<{ tier: number; track: PassTrack }>("select tier, track from pass_claims where user_id = $1 and season = $2", [userId, season]),
    db.query<{ premium: boolean }>("select coalesce(premium_until > now(), false) as premium from users where id = $1", [userId]),
  ]);
  const xp = progress.rows[0]?.xp ?? 0;
  const level = passLevel(xp);
  const isPremium = premium.rows[0]?.premium ?? false;
  const claimed = new Set(claims.rows.map((row) => claimKey(row.tier, row.track)));
  const tracks = isPremium ? PASS_TRACKS : (["free"] as PassTrack[]);
  let claimable = 0;
  for (let tier = 1; tier <= level; tier++) {
    for (const track of tracks) if (!claimed.has(claimKey(tier, track))) claimable++;
  }
  return { season, endsAt: seasonEnd(season), xp, level, premium: isPremium, claimed, claimable };
}

function rewardOf(tier: number, track: PassTrack): PassReward {
  return PASS_REWARDS[tier - 1][track];
}

// Enregistre le palier comme réclamé et verse ses packs, seulement si ce n'était pas déjà fait
async function grantTier(client: PoolClient, userId: string, season: string, tier: number, track: PassTrack, auto: boolean) {
  const inserted = await client.query(
    `insert into pass_claims (user_id, season, tier, track, auto) values ($1, $2, $3, $4, $5)
     on conflict (user_id, season, tier, track) do nothing`,
    [userId, season, tier, track, auto],
  );
  if (!inserted.rowCount) return false;
  await grantPacks(client, userId, rewardOf(tier, track));
  return true;
}

export async function claimPassTier(userId: string, tier: number, track: PassTrack): Promise<PassReward> {
  if (!Number.isInteger(tier) || tier < 1 || tier > PASS_REWARDS.length || !PASS_TRACKS.includes(track)) {
    throw new PassError("Palier inconnu.");
  }
  const state = await getPassState(userId);
  if (tier > state.level) throw new PassError("Ce palier n'est pas encore atteint.");
  if (track === "premium" && !state.premium) throw new PassError("Cette récompense est réservée aux comptes premium.");

  const granted = await withTransaction((client) => grantTier(client, userId, state.season, tier, track, false));
  if (!granted) throw new PassError("Tu as déjà récupéré cette récompense.");
  return rewardOf(tier, track);
}

// Réclame tous les paliers atteints ; renvoie le nombre de récompenses versées
export async function claimAllPass(userId: string): Promise<number> {
  const state = await getPassState(userId);
  const tracks = state.premium ? PASS_TRACKS : (["free"] as PassTrack[]);
  return withTransaction(async (client) => {
    let count = 0;
    for (let tier = 1; tier <= state.level; tier++) {
      for (const track of tracks) if (await grantTier(client, userId, state.season, tier, track, false)) count++;
    }
    return count;
  });
}

// Saisons passées : verse les paliers atteints et non réclamés (ligne premium seulement si le premium
// couvrait la fin de la saison), une seule fois. Renvoie le nombre de récompenses versées.
export async function settlePastSeasons(userId: string): Promise<number> {
  const season = currentSeason();
  const pending = await db.query("select 1 from pass_progress where user_id = $1 and season < $2 and not settled limit 1", [userId, season]);
  if (!pending.rowCount) return 0;

  return withTransaction(async (client) => {
    // skip locked : si une autre page fait déjà le versement, celle-ci n'attend pas et ne verse rien
    const { rows } = await client.query<{ season: string; xp: number; premium: boolean }>(
      `select to_char(p.season, 'YYYY-MM-DD') as season, p.xp,
              coalesce(u.premium_until >= (p.season + interval '1 month'), false) as premium
       from pass_progress p join users u on u.id = p.user_id
       where p.user_id = $1 and p.season < $2 and not p.settled
       for update of p skip locked`,
      [userId, season],
    );
    let count = 0;
    for (const row of rows) {
      const tracks = row.premium ? PASS_TRACKS : (["free"] as PassTrack[]);
      for (let tier = 1; tier <= passLevel(row.xp); tier++) {
        for (const track of tracks) if (await grantTier(client, userId, row.season, tier, track, true)) count++;
      }
      await client.query("update pass_progress set settled = true where user_id = $1 and season = $2", [userId, row.season]);
    }
    return count;
  });
}
