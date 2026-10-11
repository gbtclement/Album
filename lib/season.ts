import type { PoolClient } from "pg";
import { cached } from "@/lib/cache";
import { db, withTransaction } from "@/lib/db";
import { grantPacks } from "@/lib/packs";
import { currentSeason } from "@/lib/pass";
import type { RarityTier } from "@/lib/rarity";
import { seasonPoints, seasonReward, type SeasonReward } from "@/lib/season-rules";

// Classement saisonnier (lot S1) : points gagnés en ouvrant des packs pendant le mois (table pass_progress,
// colonne season_points). À la première visite d'un mois suivant, le top 20 du mois écoulé reçoit sa récompense.

// Ajoute les points des cartes d'un pack ouvert. Doit être appelée dans la transaction de l'ouverture.
export async function addSeasonPoints(client: PoolClient, userId: string, tiers: RarityTier[]) {
  const points = seasonPoints(tiers);
  if (points <= 0) return;
  await client.query(
    `insert into pass_progress (user_id, season, season_points, points_at) values ($1, $2, $3, now())
     on conflict (user_id, season) do update set season_points = pass_progress.season_points + excluded.season_points, points_at = now()`,
    [userId, currentSeason(), points],
  );
}

export type SeasonRow = { rank: number; user_id: string; pseudo: string; score: number };

// Rang : plus de points d'abord, puis le premier arrivé à ce score. Les joueurs à 0 point ne sont pas classés.
const RANKED_SQL = `
  select p.user_id, u.pseudo, p.season_points as score,
         (row_number() over (order by p.season_points desc, p.points_at asc, p.user_id))::int as rank
  from pass_progress p join users u on u.id = p.user_id
  where p.season = $1 and p.season_points > 0`;

export async function getSeasonTop(limit: number, season = currentSeason()): Promise<SeasonRow[]> {
  // Cache court : le classement de la saison bouge à chaque pack ouvert
  return cached(`leaderboard:season:${season}:${limit}`, 60, async () => {
    const { rows } = await db.query<SeasonRow>(`select * from (${RANKED_SQL}) t where t.rank <= $2 order by t.rank`, [season, limit]);
    return rows;
  });
}

export async function getSeasonRank(userId: string, season = currentSeason()): Promise<SeasonRow | null> {
  const { rows } = await db.query<SeasonRow>(`select * from (${RANKED_SQL}) t where t.user_id = $2`, [season, userId]);
  return rows[0] ?? null;
}

export type SeasonAward = { season: string; rank: number; reward: SeasonReward };

// Saisons passées pas encore examinées : verse la récompense si le joueur a fini dans le top 20, une seule fois.
// Renvoie la récompense versée (pour le message de la barre du haut), ou null.
export async function settleSeasonRanking(userId: string): Promise<SeasonAward | null> {
  const season = currentSeason();
  const pending = await db.query("select 1 from pass_progress where user_id = $1 and season < $2 and not ranked limit 1", [userId, season]);
  if (!pending.rowCount) return null;

  return withTransaction(async (client) => {
    // skip locked : si une autre page fait déjà le versement, celle-ci n'attend pas et ne verse rien
    const { rows } = await client.query<{ season: string }>(
      `select to_char(season, 'YYYY-MM-DD') as season from pass_progress
       where user_id = $1 and season < $2 and not ranked order by season for update skip locked`,
      [userId, season],
    );
    let last: SeasonAward | null = null;
    for (const row of rows) {
      // La saison est finie : plus personne ne peut y gagner de points, la place est définitive
      const { rows: ranked } = await client.query<{ rank: number; score: number }>(
        `select rank, score from (${RANKED_SQL}) t where t.user_id = $2`,
        [row.season, userId],
      );
      const place = ranked[0];
      const reward = place ? seasonReward(place.rank) : null;
      if (place && reward) {
        const inserted = await client.query(
          `insert into season_awards (user_id, season, rank, points, coins, classic, epic, legendary)
           values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (user_id, season) do nothing`,
          [userId, row.season, place.rank, place.score, reward.coins, reward.classic, reward.epic, reward.legendary],
        );
        if (inserted.rowCount) {
          await client.query("update users set coins = coins + $2 where id = $1", [userId, reward.coins]);
          await grantPacks(client, userId, { classic: reward.classic, epic: reward.epic, legendary: reward.legendary });
          last = { season: row.season, rank: place.rank, reward };
        }
      }
      await client.query("update pass_progress set ranked = true where user_id = $1 and season = $2", [userId, row.season]);
    }
    return last;
  });
}
