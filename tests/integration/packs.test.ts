import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { MAX_STOCK, PACK_INTERVAL_MS, PACK_SIZE } from "@/lib/pack-rules";
import { getPackState, openPack, PackError } from "@/lib/packs";
import { RARITY_TIERS } from "@/lib/rarity";
import { createAlbum, createTestUser, resetDatabase, warmPool } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
  for (const tier of RARITY_TIERS) await createAlbum(tier);
});

async function setStock(userId: string, stock: number, minutesAgo: number) {
  await db.query(
    `insert into pack_stocks (user_id, stock, last_recharged_at) values ($1, $2, now() - make_interval(mins => $3))
     on conflict (user_id) do update set stock = excluded.stock, last_recharged_at = excluded.last_recharged_at`,
    [userId, stock, minutesAgo],
  );
}

describe("openPack", () => {
  it("consomme un pack et ajoute les cartes à la collection", async () => {
    const user = await createTestUser();
    const before = await getPackState(user.id);

    const { cards, state } = await openPack(user.id);

    expect(cards).toHaveLength(PACK_SIZE);
    expect(state.stock).toBe(before.stock - 1);
    const owned = await db.query<{ total: number }>(
      "select sum(count)::int as total from user_albums where user_id = $1",
      [user.id],
    );
    expect(owned.rows[0].total).toBe(PACK_SIZE);
    const quest = await db.query<{ progress: number }>(
      "select progress from user_quests where user_id = $1 and quest_key = 'daily_packs'",
      [user.id],
    );
    expect(quest.rows[0].progress).toBe(1);
  });

  it("marque comme nouvelles uniquement les cartes pas encore possédées", async () => {
    const user = await createTestUser();
    const { cards } = await openPack(user.id);
    // Avec 5 albums au catalogue, un album tiré deux fois dans le même pack n'est nouveau que la première fois
    const seen = new Set<string>();
    for (const card of cards) {
      expect(card.isNew).toBe(!seen.has(card.slug));
      seen.add(card.slug);
    }
  });

  it("refuse d'ouvrir un pack quand le stock est vide", async () => {
    const user = await createTestUser();
    await setStock(user.id, 0, 0);
    await expect(openPack(user.id)).rejects.toBeInstanceOf(PackError);
  });

  it("n'ouvre qu'un pack quand plusieurs demandes arrivent en même temps avec un seul pack en stock", async () => {
    const user = await createTestUser();
    await setStock(user.id, 1, 0);
    await warmPool();

    const results = await Promise.allSettled([openPack(user.id), openPack(user.id), openPack(user.id)]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const openings = await db.query("select 1 from pack_openings where user_id = $1", [user.id]);
    expect(openings.rowCount).toBe(1);
  });
});

describe("recharge du stock", () => {
  it("ajoute un pack toutes les 5 minutes écoulées", async () => {
    const user = await createTestUser();
    await setStock(user.id, 0, 11);

    const state = await getPackState(user.id);

    expect(state.stock).toBe(2);
    // Prochain pack : 15 minutes après le départ, soit dans 4 minutes
    const remaining = state.nextPackAt!.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(3.5 * 60_000);
    expect(remaining).toBeLessThan(4.5 * 60_000);
  });

  it("ne dépasse jamais le maximum", async () => {
    const user = await createTestUser();
    await setStock(user.id, 0, (PACK_INTERVAL_MS / 60_000) * (MAX_STOCK + 20));

    expect(await getPackState(user.id)).toEqual({ stock: MAX_STOCK, nextPackAt: null });
  });
});
