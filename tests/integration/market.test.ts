import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { buyListing, createListing, MarketError } from "@/lib/market";
import { coinsOf, createAlbum, createTestUser, giveAlbum, ownedCount, resetDatabase, warmPool } from "./helpers";

beforeEach(resetDatabase);

async function listingIdOf(sellerId: string) {
  const { rows } = await db.query<{ id: string }>(
    "select id from listings where seller_id = $1 order by id desc limit 1",
    [sellerId],
  );
  return rows[0].id;
}

async function listingStatus(id: string) {
  const { rows } = await db.query<{ status: string }>("select status from listings where id = $1", [id]);
  return rows[0].status;
}

describe("vente contre des pièces", () => {
  it("transfère l'album et les pièces, et enregistre la vente", async () => {
    const seller = await createTestUser({ coins: 1000 });
    const buyer = await createTestUser({ coins: 1000 });
    const album = await createAlbum();
    await giveAlbum(seller.id, album.id);
    await createListing(seller.id, album.slug, { kind: "coins", price: 200 });
    const id = await listingIdOf(seller.id);

    await buyListing(buyer.id, id, null);

    expect(await coinsOf(buyer.id)).toBe(800);
    // Taxe du marché : 5 % de 200 = 10 pièces qui disparaissent
    expect(await coinsOf(seller.id)).toBe(1190);
    expect(await ownedCount(buyer.id, album.id)).toBe(1);
    expect(await ownedCount(seller.id, album.id)).toBe(0);
    expect(await listingStatus(id)).toBe("sold");
    const sales = await db.query("select 1 from market_sales where album_id = $1", [album.id]);
    expect(sales.rowCount).toBe(1);
  });

  it("le vendeur reçoit le prix moins 5 %, l'acheteur paie le prix : la taxe disparaît", async () => {
    const seller = await createTestUser({ coins: 0 });
    const buyer = await createTestUser({ coins: 1000 });
    const album = await createAlbum();
    await giveAlbum(seller.id, album.id);
    await createListing(seller.id, album.slug, { kind: "coins", price: 1000 });

    await buyListing(buyer.id, await listingIdOf(seller.id), null);

    expect(await coinsOf(buyer.id)).toBe(0);
    expect(await coinsOf(seller.id)).toBe(950);
    const sale = await db.query<{ price_coins: number }>("select price_coins from market_sales where album_id = $1", [album.id]);
    expect(sale.rows[0].price_coins).toBe(1000);
  });

  it("refuse l'achat sans assez de pièces, sans rien modifier", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser({ coins: 50 });
    const album = await createAlbum();
    await giveAlbum(seller.id, album.id);
    await createListing(seller.id, album.slug, { kind: "coins", price: 200 });
    const id = await listingIdOf(seller.id);

    await expect(buyListing(buyer.id, id, null)).rejects.toThrow("pas assez de pièces");

    expect(await coinsOf(buyer.id)).toBe(50);
    expect(await ownedCount(seller.id, album.id)).toBe(1);
    expect(await listingStatus(id)).toBe("active");
  });

  it("refuse d'acheter sa propre annonce", async () => {
    const seller = await createTestUser();
    const album = await createAlbum();
    await giveAlbum(seller.id, album.id);
    await createListing(seller.id, album.slug, { kind: "coins", price: 10 });

    await expect(buyListing(seller.id, await listingIdOf(seller.id), null)).rejects.toBeInstanceOf(MarketError);
  });

  it("ne vend qu'une fois une annonce achetée par deux joueurs en même temps", async () => {
    const seller = await createTestUser({ coins: 0 });
    const first = await createTestUser({ coins: 500 });
    const second = await createTestUser({ coins: 500 });
    const album = await createAlbum();
    await giveAlbum(seller.id, album.id);
    await createListing(seller.id, album.slug, { kind: "coins", price: 100 });
    const id = await listingIdOf(seller.id);

    await warmPool();
    const results = await Promise.allSettled([buyListing(first.id, id, null), buyListing(second.id, id, null)]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    // Une seule vente : 100 pièces moins la taxe de 5 %
    expect(await coinsOf(seller.id)).toBe(95);
    expect((await coinsOf(first.id)) + (await coinsOf(second.id))).toBe(900);
    expect((await ownedCount(first.id, album.id)) + (await ownedCount(second.id, album.id))).toBe(1);
  });

  it("retire l'annonce si le vendeur n'a plus l'album", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const album = await createAlbum();
    await giveAlbum(seller.id, album.id);
    await createListing(seller.id, album.slug, { kind: "coins", price: 100 });
    const id = await listingIdOf(seller.id);
    await db.query("delete from user_albums where user_id = $1", [seller.id]);

    await expect(buyListing(buyer.id, id, null)).rejects.toThrow("ne possède plus");

    expect(await listingStatus(id)).toBe("cancelled");
    expect(await coinsOf(buyer.id)).toBe(1000);
  });
});

describe("annonces", () => {
  it("limite le nombre d'annonces au nombre d'exemplaires possédés", async () => {
    const seller = await createTestUser();
    const album = await createAlbum();
    await giveAlbum(seller.id, album.id, 2);

    await createListing(seller.id, album.slug, { kind: "coins", price: 10 });
    await createListing(seller.id, album.slug, { kind: "coins", price: 20 });
    await expect(createListing(seller.id, album.slug, { kind: "coins", price: 30 })).rejects.toBeInstanceOf(
      MarketError,
    );
  });

  it("refuse un prix hors limites", async () => {
    const seller = await createTestUser();
    const album = await createAlbum();
    await giveAlbum(seller.id, album.id);

    for (const price of [0, 1.5, 100001]) {
      await expect(createListing(seller.id, album.slug, { kind: "coins", price })).rejects.toBeInstanceOf(MarketError);
    }
  });
});

describe("troc", () => {
  it("échange l'album de l'annonce contre l'album demandé", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const offered = await createAlbum();
    const wanted = await createAlbum();
    await giveAlbum(seller.id, offered.id);
    await giveAlbum(buyer.id, wanted.id);
    await createListing(seller.id, offered.slug, { kind: "swap", wantedSlug: wanted.slug });
    const id = await listingIdOf(seller.id);

    await buyListing(buyer.id, id, wanted.slug);

    expect(await ownedCount(buyer.id, offered.id)).toBe(1);
    expect(await ownedCount(seller.id, wanted.id)).toBe(1);
    expect(await ownedCount(buyer.id, wanted.id)).toBe(0);
    expect(await coinsOf(buyer.id)).toBe(1000);
  });

  it("refuse un autre album que celui demandé", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const offered = await createAlbum();
    const wanted = await createAlbum();
    const other = await createAlbum();
    await giveAlbum(seller.id, offered.id);
    await giveAlbum(buyer.id, other.id);
    await createListing(seller.id, offered.slug, { kind: "swap", wantedSlug: wanted.slug });

    await expect(buyListing(buyer.id, await listingIdOf(seller.id), other.slug)).rejects.toThrow("pas celui demandé");
  });
});
