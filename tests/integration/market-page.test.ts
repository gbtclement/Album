import { beforeEach, describe, expect, it } from "vitest";
import { createListing, listMarketPage, MARKET_PAGE_SIZE } from "@/lib/market";
import { createAlbum, createTestUser, giveAlbum, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

async function sell(sellerId: string, price: number | null, tier: Parameters<typeof createAlbum>[0] = "commun") {
  const album = await createAlbum(tier);
  await giveAlbum(sellerId, album.id);
  if (price === null) {
    const wanted = await createAlbum();
    await createListing(sellerId, album.slug, { kind: "swap", wantedSlug: wanted.slug });
  } else {
    await createListing(sellerId, album.slug, { kind: "coins", price });
  }
  return album;
}

describe("page du marché", () => {
  it("trie par prix, les trocs à la fin, sans les annonces du joueur", async () => {
    const seller = await createTestUser();
    const viewer = await createTestUser();
    await sell(seller.id, 300);
    await sell(seller.id, null);
    await sell(seller.id, 100);
    await sell(viewer.id, 5);

    const up = await listMarketPage({ excludeSellerId: viewer.id, tier: null, sort: "prix-croissant", page: 1 });
    expect(up.listings.map((l) => l.price_coins)).toEqual([100, 300, null]);
    expect(up.total).toBe(3);

    const down = await listMarketPage({ excludeSellerId: viewer.id, tier: null, sort: "prix-decroissant", page: 1 });
    expect(down.listings.map((l) => l.price_coins)).toEqual([300, 100, null]);
  });

  it("filtre par rareté et découpe en pages", async () => {
    const seller = await createTestUser();
    const viewer = await createTestUser();
    for (let i = 0; i < MARKET_PAGE_SIZE + 2; i++) await sell(seller.id, 10 + i);
    await sell(seller.id, 999, "legendaire");

    const legendary = await listMarketPage({ excludeSellerId: viewer.id, tier: "legendaire", sort: "recentes", page: 1 });
    expect(legendary.total).toBe(1);
    expect(legendary.listings[0].price_coins).toBe(999);

    const second = await listMarketPage({ excludeSellerId: viewer.id, tier: "commun", sort: "prix-croissant", page: 2 });
    expect(second.total).toBe(MARKET_PAGE_SIZE + 2);
    expect(second.listings.map((l) => l.price_coins)).toEqual([10 + MARKET_PAGE_SIZE, 11 + MARKET_PAGE_SIZE]);
  });
});
