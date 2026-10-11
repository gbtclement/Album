import type { PoolClient } from "pg";
import { db, withTransaction } from "@/lib/db";
import { ACHIEVEMENTS, type AchievementDef, type AchievementStat } from "@/lib/achievement-rules";

// Succès : vérifiés à chaque page (barre d'infos), débloqués une seule fois, pièces versées tout de suite.
// Un joueur qui remplit déjà une condition le débloque à sa prochaine visite.

export type AchievementStats = Record<AchievementStat, number>;

export async function getAchievementStats(client: PoolClient | typeof db, userId: string): Promise<AchievementStats> {
  const { rows } = await client.query<{
    albums: number; tiers: string[]; packs: number; sets: number; friends: number; trades: number; sales: number; draws: number; best_streak: number;
  }>(
    `select
       (select count(*) from user_albums where user_id = $1 and count > 0)::int as albums,
       (select coalesce(array_agg(distinct a.rarity_tier), '{}') from user_albums ua join albums a on a.id = ua.album_id
         where ua.user_id = $1 and ua.count > 0) as tiers,
       (select count(*) from pack_openings where user_id = $1)::int as packs,
       (select count(*) from artist_set_rewards where user_id = $1)::int as sets,
       (select count(*) from friendships where status = 'accepted' and (requester_id = $1 or addressee_id = $1))::int as friends,
       (select count(*) from trades where status = 'accepted' and (proposer_id = $1 or receiver_id = $1))::int as trades,
       (select count(*) from listings where seller_id = $1 and status = 'sold')::int as sales,
       (select count(*) from daily_draws where user_id = $1 and solved)::int as draws,
       (select coalesce(max(streak), 0) from daily_draws where user_id = $1)::int as best_streak`,
    [userId],
  );
  const row = rows[0];
  const has = (...tiers: string[]) => (row.tiers.some((tier) => tiers.includes(tier)) ? 1 : 0);
  return {
    albums: row.albums,
    rare: has("rare", "epique", "legendaire"),
    epic: has("epique", "legendaire"),
    legendary: has("legendaire"),
    tiers: row.tiers.length,
    packs: row.packs,
    sets: row.sets,
    friends: row.friends,
    trades: row.trades,
    sales: row.sales,
    draws: row.draws,
    bestStreak: row.best_streak,
  };
}

// Débloque les succès atteints et verse leurs pièces ; renvoie ceux qui viennent d'être débloqués
export async function syncAchievements(userId: string): Promise<AchievementDef[]> {
  const stats = await getAchievementStats(db, userId);
  const { rows } = await db.query<{ key: string }>("select key from user_achievements where user_id = $1", [userId]);
  const unlocked = new Set(rows.map((row) => row.key));
  const reached = ACHIEVEMENTS.filter((item) => !unlocked.has(item.key) && stats[item.stat] >= item.target);
  if (reached.length === 0) return [];

  return withTransaction(async (client) => {
    const fresh: AchievementDef[] = [];
    for (const item of reached) {
      // Deux pages chargées en même temps : seule la première insertion compte, les pièces ne sont versées qu'une fois
      const inserted = await client.query(
        "insert into user_achievements (user_id, key, reward) values ($1, $2, $3) on conflict (user_id, key) do nothing",
        [userId, item.key, item.reward],
      );
      if (inserted.rowCount) fresh.push(item);
    }
    const coins = fresh.reduce((sum, item) => sum + item.reward, 0);
    if (coins > 0) await client.query("update users set coins = coins + $2 where id = $1", [userId, coins]);
    return fresh;
  });
}

// Succès débloqués pas encore annoncés au joueur : renvoyés une seule fois (notification de la barre d'infos)
export async function takeAchievementNotices(userId: string): Promise<AchievementDef[]> {
  const { rows } = await db.query<{ key: string }>(
    "update user_achievements set notified = true where user_id = $1 and not notified returning key",
    [userId],
  );
  const keys = new Set(rows.map((row) => row.key));
  return ACHIEVEMENTS.filter((item) => keys.has(item.key));
}

export type AchievementStatus = AchievementDef & { unlockedAt: Date | null; progress: number };

export async function getAchievements(userId: string): Promise<AchievementStatus[]> {
  const [stats, unlocked] = await Promise.all([
    getAchievementStats(db, userId),
    db.query<{ key: string; unlocked_at: Date }>("select key, unlocked_at from user_achievements where user_id = $1", [userId]),
  ]);
  const dates = new Map(unlocked.rows.map((row) => [row.key, row.unlocked_at]));
  return ACHIEVEMENTS.map((item) => ({
    ...item,
    unlockedAt: dates.get(item.key) ?? null,
    progress: Math.min(stats[item.stat], item.target),
  }));
}

// Nombre de succès de plusieurs joueurs (liste d'amis), vérifiés d'abord pour être à jour
export async function countAchievements(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  for (const id of userIds) await syncAchievements(id);
  const { rows } = await db.query<{ user_id: string; total: number }>(
    "select user_id, count(*)::int as total from user_achievements where user_id = any($1::uuid[]) group by user_id",
    [userIds],
  );
  return new Map(rows.map((row) => [row.user_id, row.total]));
}
