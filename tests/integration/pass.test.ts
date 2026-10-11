import { beforeEach, describe, expect, it } from "vitest";
import { db, withTransaction } from "@/lib/db";
import { submitGuess, getTodayDraw } from "@/lib/daily-draw";
import { getPackState, grantPacks, openPack } from "@/lib/packs";
import { claimAllPass, claimPassTier, currentSeason, getPassState, PassError, settlePastSeasons } from "@/lib/pass";
import { PASS_XP } from "@/lib/pass-rules";
import { setPremium } from "@/lib/premium";
import { RARITY_TIERS } from "@/lib/rarity";
import { createAlbum, createTestUser, resetDatabase, warmPool } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
  for (const tier of RARITY_TIERS) await createAlbum(tier);
});

async function xpOf(userId: string) {
  const { rows } = await db.query<{ xp: number }>("select coalesce(sum(xp), 0)::int as xp from pass_progress where user_id = $1", [userId]);
  return rows[0].xp;
}

async function lastOpeningXp(userId: string) {
  const { rows } = await db.query<{ tiers: string[] }>(
    `select array(select a.rarity_tier from unnest(po.album_ids) with ordinality x(id, n) join albums a on a.id = x.id order by x.n) as tiers
     from pack_openings po where user_id = $1 order by opened_at desc limit 1`,
    [userId],
  );
  return rows[0].tiers.reduce((sum, tier) => sum + PASS_XP[tier as keyof typeof PASS_XP], 0);
}

describe("passe de combat : XP", () => {
  it("chaque carte d'un pack rapporte l'XP de sa rareté, packs gagnés et Solo compris", async () => {
    const user = await createTestUser();
    await withTransaction((client) => grantPacks(client, user.id, { classic: 1, solo: 1 }));

    await openPack(user.id);
    const first = await lastOpeningXp(user.id);
    expect(await xpOf(user.id)).toBe(first);

    await db.query("update pack_stocks set stock = 0 where user_id = $1", [user.id]);
    await openPack(user.id); // pack gagné
    const second = await lastOpeningXp(user.id);
    await openPack(user.id, "solo");
    const third = await lastOpeningXp(user.id);
    expect(await xpOf(user.id)).toBe(first + second + third);
  });

  it("la pioche du jour rapporte l'XP de sa carte si elle est trouvée, rien sinon", async () => {
    const winner = await createTestUser();
    const loser = await createTestUser();
    const drawn = await getTodayDraw(winner.id);
    await getTodayDraw(loser.id);
    const { rows } = await db.query<{ user_id: string; album_id: string }>("select user_id, album_id from daily_draws");
    const albumOf = (id: string) => rows.find((row) => row.user_id === id)!.album_id;
    const other = await db.query<{ id: string }>("select id from albums where id <> $1 limit 1", [albumOf(loser.id)]);

    await submitGuess(winner.id, albumOf(winner.id));
    await submitGuess(loser.id, other.rows[0].id);

    expect(await xpOf(winner.id)).toBe(PASS_XP[drawn.tier]);
    expect(await xpOf(loser.id)).toBe(0);
  });
});

async function setXp(userId: string, xp: number, season = currentSeason()) {
  await db.query(
    `insert into pass_progress (user_id, season, xp) values ($1, $2, $3)
     on conflict (user_id, season) do update set xp = excluded.xp`,
    [userId, season, xp],
  );
}

async function packsOf(userId: string) {
  const state = await getPackState(userId);
  return { bonus: state.bonus, solo: state.solo, epic: state.epic, legendary: state.legendary };
}

describe("passe de combat : paliers", () => {
  it("un palier atteint se réclame une seule fois, même avec deux demandes simultanées", async () => {
    const user = await createTestUser();
    await setXp(user.id, 1500);
    await warmPool();

    const results = await Promise.allSettled([claimPassTier(user.id, 1, "free"), claimPassTier(user.id, 1, "free")]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await packsOf(user.id)).toMatchObject({ solo: 1 });
    await expect(claimPassTier(user.id, 2, "free")).rejects.toThrow("pas encore atteint");
  });

  it("la ligne premium est réservée aux premium, et débloque les paliers déjà atteints", async () => {
    const user = await createTestUser();
    await setXp(user.id, 10_000);
    await expect(claimPassTier(user.id, 10, "premium")).rejects.toBeInstanceOf(PassError);
    expect((await getPassState(user.id)).claimable).toBe(10);

    await setPremium(user.email, 30);
    expect((await getPassState(user.id)).claimable).toBe(20);
    await claimPassTier(user.id, 10, "premium");
    expect(await packsOf(user.id)).toMatchObject({ epic: 1 });
  });

  it("Tout réclamer verse chaque palier atteint, puis plus rien", async () => {
    const user = await createTestUser();
    await setXp(user.id, 45_000);
    expect(await claimAllPass(user.id)).toBe(30);
    expect(await packsOf(user.id)).toEqual({ bonus: 4, solo: 24, epic: 2, legendary: 0 });
    expect(await claimAllPass(user.id)).toBe(0);
    expect((await getPassState(user.id)).level).toBe(30);
  });

  it("verse automatiquement une saison passée, une seule fois, premium seulement s'il couvrait la fin", async () => {
    const free = await createTestUser();
    const premium = await createTestUser();
    const past = "2026-01-01";
    await setXp(free.id, 2000, past);
    await setXp(premium.id, 2000, past);
    await db.query("update users set premium_until = '2026-03-01' where id = $1", [premium.id]);
    await db.query("insert into pass_claims (user_id, season, tier, track) values ($1, $2, 1, 'free')", [free.id, past]);
    await warmPool();

    const [a, b] = await Promise.all([settlePastSeasons(free.id), settlePastSeasons(free.id)]);
    expect(a + b).toBe(1);
    expect(await settlePastSeasons(free.id)).toBe(0);
    expect(await packsOf(free.id)).toMatchObject({ solo: 1 });

    expect(await settlePastSeasons(premium.id)).toBe(4);
    expect(await packsOf(premium.id)).toMatchObject({ solo: 2, bonus: 2 });
  });
});
