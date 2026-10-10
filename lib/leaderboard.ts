import { cached } from "@/lib/cache";
import { db } from "@/lib/db";

// Points par palier de rareté, appliqués une fois par album distinct possédé.
// Les valeurs doivent rester celles de RARITY_POINTS (lib/rarity.ts).
const POINTS_SQL = `case a.rarity_tier
  when 'commun' then 1
  when 'peu_commun' then 2
  when 'rare' then 5
  when 'epique' then 10
  when 'legendaire' then 25
  else 0 end`;

// Un joueur par ligne, avec son score. Les doublons ne comptent qu'une fois dans le score.
const SCORES_SQL = `
  select u.id as user_id, u.pseudo,
         sum(${POINTS_SQL})::int as score,
         count(*)::int as albums,
         count(*) filter (where a.rarity_tier in ('epique', 'legendaire'))::int as rares
  from user_albums ua
  join users u on u.id = ua.user_id
  join albums a on a.id = ua.album_id
  group by u.id, u.pseudo`;

export type LeaderRow = {
  rank: number;
  user_id: string;
  pseudo: string;
  score: number;
  albums: number;
  rares: number;
};

export async function getTopPlayers(limit: number): Promise<LeaderRow[]> {
  // Mis en cache 5 minutes : le classement n'a pas besoin d'être recalculé à chaque visite
  return cached(`leaderboard:top:${limit}`, 300, async () => {
    const result = await db.query<LeaderRow>(
      `select * from (
         select ranked.*, (rank() over (order by ranked.score desc, ranked.albums desc, lower(ranked.pseudo)))::int as rank
         from (${SCORES_SQL}) ranked
       ) t
       where t.rank <= $1
       order by t.rank, lower(t.pseudo)`,
      [limit],
    );
    return result.rows;
  });
}

// Classement restreint à quelques joueurs (onglet Amis) : rangs recalculés entre eux
export async function getRankingAmong(userIds: string[]): Promise<LeaderRow[]> {
  if (userIds.length === 0) return [];
  const result = await db.query<LeaderRow>(
    `select ranked.*, (rank() over (order by ranked.score desc, ranked.albums desc, lower(ranked.pseudo)))::int as rank
     from (${SCORES_SQL}) ranked
     where ranked.user_id = any($1::uuid[])
     order by rank, lower(ranked.pseudo)`,
    [userIds],
  );
  return result.rows;
}

// Position d'un joueur, même s'il n'est pas dans le top. Null s'il ne possède aucun album.
export async function getPlayerRank(userId: string): Promise<LeaderRow | null> {
  const result = await db.query<LeaderRow>(
    `select * from (
       select ranked.*, (rank() over (order by ranked.score desc, ranked.albums desc, lower(ranked.pseudo)))::int as rank
       from (${SCORES_SQL}) ranked
     ) t
     where t.user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}
