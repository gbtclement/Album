import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getTodayDraw, submitGuess } from "@/lib/daily-draw";
import { getPackState, openPack } from "@/lib/packs";
import { RARITY_POINTS, RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { currentSeason } from "@/lib/pass";
import { getSeasonRank, getSeasonTop, settleSeasonRanking } from "@/lib/season";
import { coinsOf, createAlbum, createTestUser, resetDatabase, warmPool } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
  for (const tier of RARITY_TIERS) await createAlbum(tier);
});

async function pointsOf(userId: string) {
  const { rows } = await db.query<{ points: number }>(
    "select coalesce(sum(season_points), 0)::int as points from pass_progress where user_id = $1",
    [userId],
  );
  return rows[0].points;
}

async function setPoints(userId: string, points: number, season: string, minutesAgo = 0) {
  await db.query(
    `insert into pass_progress (user_id, season, season_points, points_at) values ($1, $2, $3, now() - make_interval(mins => $4))
     on conflict (user_id, season) do update set season_points = excluded.season_points, points_at = excluded.points_at`,
    [userId, season, points, minutesAgo],
  );
}

describe("classement saisonnier : points", () => {
  it("l'ouverture d'un pack rapporte les points de rareté de ses cartes, la pioche du jour rien", async () => {
    const user = await createTestUser();
    await openPack(user.id);
    const { rows } = await db.query<{ tiers: RarityTier[] }>(
      `select array(select a.rarity_tier from unnest(po.album_ids) x(id) join albums a on a.id = x.id) as tiers
       from pack_openings po where user_id = $1`,
      [user.id],
    );
    const expected = rows[0].tiers.reduce((sum, tier) => sum + RARITY_POINTS[tier], 0);
    expect(await pointsOf(user.id)).toBe(expected);

    await getTodayDraw(user.id);
    const draw = await db.query<{ album_id: string }>("select album_id from daily_draws where user_id = $1", [user.id]);
    await submitGuess(user.id, draw.rows[0].album_id);
    expect(await pointsOf(user.id)).toBe(expected);
  });

  it("classe par points, le premier arrivé passe devant en cas d'égalité, sans les joueurs à 0", async () => {
    const [a, b, c, d] = [await createTestUser(), await createTestUser(), await createTestUser(), await createTestUser()];
    const season = currentSeason();
    await setPoints(a.id, 50, season, 1);
    await setPoints(b.id, 80, season, 1);
    await setPoints(c.id, 50, season, 10);
    await setPoints(d.id, 0, season, 1);

    const top = await getSeasonTop(10);
    expect(top.map((row) => [row.pseudo, row.rank])).toEqual([[b.pseudo, 1], [c.pseudo, 2], [a.pseudo, 3]]);
    expect(await getSeasonRank(a.id)).toMatchObject({ rank: 3, score: 50 });
    expect(await getSeasonRank(d.id)).toBeNull();
  });
});

describe("classement saisonnier : fin de saison", () => {
  it("verse la récompense de sa place une seule fois au top 20, rien au-delà", async () => {
    const past = "2026-01-01";
    const players = [];
    for (let i = 0; i < 21; i++) {
      const user = await createTestUser({ coins: 0 });
      await setPoints(user.id, 1000 - i, past);
      players.push(user);
    }
    await warmPool();

    const [first, again] = await Promise.all([settleSeasonRanking(players[0].id), settleSeasonRanking(players[0].id)]);
    expect([first, again].filter(Boolean)).toEqual([expect.objectContaining({ rank: 1, season: past })]);
    expect(await coinsOf(players[0].id)).toBe(3000);
    expect(await getPackState(players[0].id)).toMatchObject({ epic: 2, legendary: 1 });
    expect(await settleSeasonRanking(players[0].id)).toBeNull();

    expect(await settleSeasonRanking(players[19].id)).toMatchObject({ rank: 20 });
    expect(await coinsOf(players[19].id)).toBe(300);
    expect(await getPackState(players[19].id)).toMatchObject({ bonus: 2 });

    expect(await settleSeasonRanking(players[20].id)).toBeNull();
    expect(await coinsOf(players[20].id)).toBe(0);
    const awards = await db.query("select 1 from season_awards");
    expect(awards.rowCount).toBe(2);
  });

  it("ne touche pas à la saison en cours", async () => {
    const user = await createTestUser({ coins: 0 });
    await setPoints(user.id, 500, currentSeason());
    expect(await settleSeasonRanking(user.id)).toBeNull();
    expect(await coinsOf(user.id)).toBe(0);
  });
});
