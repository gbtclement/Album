import { beforeEach, describe, expect, it } from "vitest";
import { db, withTransaction } from "@/lib/db";
import { buyListing, createListing } from "@/lib/market";
import { acceptTrade, closeTrade, createTrade, moveAlbum, TradeError } from "@/lib/trades";
import { coinsOf, createAlbum, createTestUser, giveAlbum, makeFriends, ownedCount, resetDatabase, warmPool } from "./helpers";

beforeEach(resetDatabase);

async function lastTradeId() {
  const { rows } = await db.query<{ id: string }>("select id from trades order by id desc limit 1");
  return rows[0].id;
}

async function tradeQuestProgress(userId: string) {
  const { rows } = await db.query<{ progress: number }>(
    "select progress from user_quests where user_id = $1 and quest_key = 'daily_trade'",
    [userId],
  );
  return rows[0]?.progress ?? 0;
}

describe("échanges entre amis", () => {
  it("refuse un échange avec un joueur qui n'est pas un ami", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    await expect(createTrade(alice.id, bob.id, { albumSlug: null, coins: 10 }, { albumSlug: null, coins: 5 })).rejects.toThrow(
      "amis",
    );
  });

  it("échange un album contre des pièces une fois accepté", async () => {
    const alice = await createTestUser({ coins: 1000 });
    const bob = await createTestUser({ coins: 1000 });
    await makeFriends(alice.id, bob.id);
    const album = await createAlbum();
    await giveAlbum(alice.id, album.id);

    await createTrade(alice.id, bob.id, { albumSlug: album.slug, coins: 0 }, { albumSlug: null, coins: 300 });
    await acceptTrade(bob.id, await lastTradeId());

    expect(await ownedCount(bob.id, album.id)).toBe(1);
    expect(await ownedCount(alice.id, album.id)).toBe(0);
    expect(await coinsOf(alice.id)).toBe(1300);
    expect(await coinsOf(bob.id)).toBe(700);
    expect(await tradeQuestProgress(alice.id)).toBe(1);
  });

  it("ne peut être accepté qu'une fois", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    await makeFriends(alice.id, bob.id);
    const album = await createAlbum();
    await giveAlbum(alice.id, album.id);
    await createTrade(alice.id, bob.id, { albumSlug: album.slug, coins: 0 }, { albumSlug: null, coins: 100 });
    const id = await lastTradeId();

    await warmPool();
    const results = await Promise.allSettled([acceptTrade(bob.id, id), acceptTrade(bob.id, id)]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await coinsOf(bob.id)).toBe(900);
  });

  it("échoue sans rien modifier si le proposeur n'a plus l'album au moment de l'acceptation", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    await makeFriends(alice.id, bob.id);
    const album = await createAlbum();
    await giveAlbum(alice.id, album.id);
    await createTrade(alice.id, bob.id, { albumSlug: album.slug, coins: 0 }, { albumSlug: null, coins: 100 });
    await db.query("delete from user_albums where user_id = $1", [alice.id]);

    await expect(acceptTrade(bob.id, await lastTradeId())).rejects.toBeInstanceOf(TradeError);
    expect(await coinsOf(bob.id)).toBe(1000);
  });

  it("un échange de pièces contre des pièces ne fait pas avancer les quêtes", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    await makeFriends(alice.id, bob.id);
    await createTrade(alice.id, bob.id, { albumSlug: null, coins: 1 }, { albumSlug: null, coins: 1 });

    await acceptTrade(bob.id, await lastTradeId());

    expect(await tradeQuestProgress(alice.id)).toBe(0);
    expect(await tradeQuestProgress(bob.id)).toBe(0);
  });

  it("seul le destinataire peut refuser, seul le proposeur peut annuler", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    await makeFriends(alice.id, bob.id);
    await createTrade(alice.id, bob.id, { albumSlug: null, coins: 10 }, { albumSlug: null, coins: 5 });
    const id = await lastTradeId();

    await expect(closeTrade(alice.id, id, "decline")).rejects.toBeInstanceOf(TradeError);
    await expect(closeTrade(bob.id, id, "cancel")).rejects.toBeInstanceOf(TradeError);
    await closeTrade(alice.id, id, "cancel");
    await expect(acceptTrade(bob.id, id)).rejects.toBeInstanceOf(TradeError);
  });
});

describe("une carte ne peut pas être dupliquée", () => {
  it("refuse de donner une carte que le joueur ne possède plus", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const album = await createAlbum();

    await expect(withTransaction((client) => moveAlbum(client, alice.id, bob.id, album.id))).rejects.toBeInstanceOf(TradeError);
    expect(await ownedCount(bob.id, album.id)).toBe(0);
  });

  it("le dernier exemplaire, vendu au marché et échangé en même temps, ne part qu'une fois", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const carol = await createTestUser();
    await makeFriends(alice.id, bob.id);
    const album = await createAlbum();
    await giveAlbum(alice.id, album.id);
    await createTrade(alice.id, bob.id, { albumSlug: album.slug, coins: 0 }, { albumSlug: null, coins: 100 });
    const tradeId = await lastTradeId();
    await createListing(alice.id, album.slug, { kind: "coins", price: 50 });
    const { rows } = await db.query<{ id: string }>("select id from listings where seller_id = $1", [alice.id]);

    await warmPool();
    await Promise.allSettled([acceptTrade(bob.id, tradeId), buyListing(carol.id, rows[0].id, null)]);

    const copies = (await ownedCount(alice.id, album.id)) + (await ownedCount(bob.id, album.id)) + (await ownedCount(carol.id, album.id));
    expect(copies).toBe(1);
  });
});
