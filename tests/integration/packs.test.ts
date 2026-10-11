import { beforeEach, describe, expect, it } from "vitest";
import { db, withTransaction } from "@/lib/db";
import { MAX_STOCK, PACK_INTERVAL_MS, PACK_SIZE, SOLO_PACK_SIZE } from "@/lib/pack-rules";
import { getPackState, grantPacks, openPack, PackError } from "@/lib/packs";
import { claimQuest, periodStart, QUESTS } from "@/lib/quests";
import { RARITY_TIERS } from "@/lib/rarity";
import { coinsOf, createAlbum, createTestUser, resetDatabase, warmPool } from "./helpers";

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

    expect(await getPackState(user.id)).toEqual({ stock: MAX_STOCK, max: MAX_STOCK, nextPackAt: null, bonus: 0, solo: 0, epic: 0, legendary: 0 });
  });
});

describe("packs gagnés", () => {
  it("un pack Solo donne une seule carte", async () => {
    const user = await createTestUser();
    await expect(openPack(user.id, "solo")).rejects.toThrow("pack Solo");
    await withTransaction((client) => grantPacks(client, user.id, { solo: 2 }));

    const { cards, state } = await openPack(user.id, "solo");
    expect(cards).toHaveLength(SOLO_PACK_SIZE);
    expect(state.solo).toBe(1);
  });

  it("un pack classique se prend dans le stock, puis dans les packs gagnés, sans maximum", async () => {
    const user = await createTestUser();
    await setStock(user.id, 1, 0);
    await withTransaction((client) => grantPacks(client, user.id, { classic: MAX_STOCK + 5 }));
    expect(await getPackState(user.id)).toMatchObject({ stock: 1, bonus: MAX_STOCK + 5 });

    expect((await openPack(user.id)).state).toMatchObject({ stock: 0, bonus: MAX_STOCK + 5 });
    const { cards, state } = await openPack(user.id);
    expect(cards).toHaveLength(PACK_SIZE);
    expect(state).toMatchObject({ stock: 0, bonus: MAX_STOCK + 4 });
  });

  it("les packs de 5 cartes (stock ou gagnés) font avancer les quêtes « Ouvre N packs », pas les Solo", async () => {
    const user = await createTestUser();
    await setStock(user.id, 1, 0);
    await withTransaction((client) => grantPacks(client, user.id, { classic: 2, solo: 2 }));

    await openPack(user.id);
    await openPack(user.id);
    await openPack(user.id, "solo");

    const { rows } = await db.query<{ quest_key: string; progress: number }>(
      "select quest_key, progress from user_quests where user_id = $1 and quest_key like '%_packs'",
      [user.id],
    );
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.progress).toBe(2);
  });

  it("un pack Épique contient 5 cartes dont au moins une épique, et compte pour les quêtes d'ouverture", async () => {
    const user = await createTestUser();
    await expect(openPack(user.id, "epic")).rejects.toThrow("pack Épique");
    await withTransaction((client) => grantPacks(client, user.id, { epic: 1, legendary: 1 }));

    const epic = await openPack(user.id, "epic");
    expect(epic.cards).toHaveLength(PACK_SIZE);
    expect(epic.cards.some((card) => card.tier === "epique")).toBe(true);
    const legendary = await openPack(user.id, "legendary");
    expect(legendary.cards.some((card) => card.tier === "legendaire")).toBe(true);
    expect(legendary.state).toMatchObject({ epic: 0, legendary: 0 });

    const { rows } = await db.query<{ progress: number }>(
      "select progress from user_quests where user_id = $1 and quest_key = 'daily_packs'",
      [user.id],
    );
    expect(rows[0].progress).toBe(2);
  });

  it("un pack Légendaire s'ouvre même sans album légendaire au catalogue", async () => {
    await db.query("delete from albums where rarity_tier = 'legendaire'");
    const user = await createTestUser();
    await withTransaction((client) => grantPacks(client, user.id, { legendary: 1 }));
    expect((await openPack(user.id, "legendary")).cards).toHaveLength(PACK_SIZE);
  });
});

describe("récompenses des quêtes", () => {
  async function finish(userId: string, key: string) {
    await db.query(
      "insert into user_quests (user_id, quest_key, period_start, progress) values ($1, $2, $3, 1000)",
      [userId, key, periodStart(QUESTS.find((quest) => quest.key === key)!.period)],
    );
  }

  it("journalière : un pack Solo, pas de pièces ; mensuelle : un pack et 500 pièces", async () => {
    const user = await createTestUser({ coins: 0 });
    await finish(user.id, "daily_new");
    await finish(user.id, "monthly_legendary");

    await claimQuest(user.id, "daily_new");
    expect(await coinsOf(user.id)).toBe(0);
    expect(await getPackState(user.id)).toMatchObject({ solo: 1, bonus: 0 });

    await claimQuest(user.id, "monthly_legendary");
    expect(await coinsOf(user.id)).toBe(500);
    expect(await getPackState(user.id)).toMatchObject({ solo: 1, bonus: 1 });
    await expect(claimQuest(user.id, "monthly_legendary")).rejects.toThrow("déjà récupéré");
  });
});
