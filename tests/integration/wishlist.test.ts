import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createListing, listMarketPage } from "@/lib/market";
import { countWishesOnSale, getWishlist, MAX_WISHES, toggleWish } from "@/lib/wishlist";
import { createAlbum, createTestUser, giveAlbum, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

describe("liste de souhaits", () => {
  it("ajoute puis retire un album", async () => {
    const user = await createTestUser();
    const album = await createAlbum("rare");
    expect(await toggleWish(user.id, album.slug)).toBe(true);
    expect((await getWishlist(user.id)).map((wish) => wish.slug)).toEqual([album.slug]);
    expect(await toggleWish(user.id, album.slug)).toBe(false);
    expect(await getWishlist(user.id)).toEqual([]);
  });

  it(`refuse au-delà de ${MAX_WISHES} albums`, async () => {
    const user = await createTestUser();
    const albums = [];
    for (let i = 0; i <= MAX_WISHES; i++) albums.push(await createAlbum());
    await db.query("insert into wishlist (user_id, album_id) select $1, unnest($2::uuid[])", [user.id, albums.slice(0, MAX_WISHES).map((album) => album.id)]);
    await expect(toggleWish(user.id, albums[MAX_WISHES].slug)).rejects.toThrow("pleine");
  });

  it("compte et filtre les souhaits en vente par d'autres, sauf ceux déjà obtenus", async () => {
    const buyer = await createTestUser();
    const seller = await createTestUser();
    const wanted = await createAlbum("epique");
    const obtained = await createAlbum("rare");
    const other = await createAlbum("commun");
    for (const album of [wanted, obtained, other]) {
      await giveAlbum(seller.id, album.id);
      await createListing(seller.id, album.slug, { kind: "coins", price: 50 });
    }
    await toggleWish(buyer.id, wanted.slug);
    await toggleWish(buyer.id, obtained.slug);
    await giveAlbum(buyer.id, obtained.id);

    expect(await countWishesOnSale(buyer.id)).toBe(1);
    const page = await listMarketPage({ excludeSellerId: buyer.id, tier: null, sort: "recentes", page: 1, wishlist: true });
    expect(page.total).toBe(1);
    expect(page.listings.map((listing) => listing.album_slug)).toEqual([wanted.slug]);
    expect((await listMarketPage({ excludeSellerId: buyer.id, tier: null, sort: "recentes", page: 1 })).total).toBe(3);

    const wishes = await getWishlist(buyer.id);
    expect(wishes.map((wish) => [wish.slug, wish.owned, wish.on_sale, wish.lowest_price])).toEqual([
      [wanted.slug, false, 1, 50],
      [obtained.slug, true, 1, 50],
    ]);
  });
});
