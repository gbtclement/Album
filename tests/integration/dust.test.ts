import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { craftAlbum, getDust, getPressableSummary, pressDuplicates } from "@/lib/dust";
import { createListing } from "@/lib/market";
import { createAlbum, createTestUser, giveAlbum, ownedCount, resetDatabase, warmPool } from "./helpers";

beforeEach(resetDatabase);

async function setDust(userId: string, dust: number) {
  await db.query("update users set dust = $2 where id = $1", [userId, dust]);
}

describe("presser les doublons", () => {
  it("presse les raretés choisies et garde un exemplaire de chaque album", async () => {
    const user = await createTestUser();
    const commun = await createAlbum("commun");
    const rare = await createAlbum("rare");
    const epique = await createAlbum("epique");
    await giveAlbum(user.id, commun.id, 3);
    await giveAlbum(user.id, rare.id, 2);
    await giveAlbum(user.id, epique.id, 2);

    expect(await pressDuplicates(user.id, { tiers: ["commun", "rare"] })).toEqual({ cards: 3, dust: 2 * 5 + 25 });
    expect(await ownedCount(user.id, commun.id)).toBe(1);
    expect(await ownedCount(user.id, rare.id)).toBe(1);
    expect(await ownedCount(user.id, epique.id)).toBe(2);
    expect(await getDust(user.id)).toBe(35);
  });

  it("ne presse pas les exemplaires en vente", async () => {
    const user = await createTestUser();
    const album = await createAlbum("commun");
    await giveAlbum(user.id, album.id, 3);
    await createListing(user.id, album.slug, { kind: "coins", price: 10 });
    await createListing(user.id, album.slug, { kind: "coins", price: 10 });

    expect((await getPressableSummary(user.id)).commun).toEqual({ cards: 1, dust: 5 });
    expect(await pressDuplicates(user.id, { slug: album.slug })).toEqual({ cards: 1, dust: 5 });
    expect(await ownedCount(user.id, album.id)).toBe(2);
    await expect(pressDuplicates(user.id, { slug: album.slug })).rejects.toThrow("Aucun doublon libre");
  });

  it("refuse quand il n'y a rien à presser", async () => {
    const user = await createTestUser();
    const album = await createAlbum("commun");
    await giveAlbum(user.id, album.id);
    await expect(pressDuplicates(user.id, { tiers: ["commun"] })).rejects.toThrow("Aucun doublon");
    await expect(pressDuplicates(user.id, { tiers: [] })).rejects.toThrow("au moins une rareté");
  });
});

describe("fabriquer un album", () => {
  it("dépense la poussière et ajoute l'album", async () => {
    const user = await createTestUser();
    const album = await createAlbum("rare");
    await setDust(user.id, 130);

    expect(await craftAlbum(user.id, album.slug)).toMatchObject({ cost: 100 });
    expect(await ownedCount(user.id, album.id)).toBe(1);
    expect(await getDust(user.id)).toBe(30);
  });

  it("refuse sans assez de poussière ou si l'album est déjà possédé", async () => {
    const user = await createTestUser();
    const album = await createAlbum("legendaire");
    await setDust(user.id, 599);
    await expect(craftAlbum(user.id, album.slug)).rejects.toThrow("600");

    await setDust(user.id, 2000);
    await giveAlbum(user.id, album.id);
    await expect(craftAlbum(user.id, album.slug)).rejects.toThrow("déjà dans ta collection");
    expect(await getDust(user.id)).toBe(2000);
  });

  it("deux fabrications simultanées ne dépensent pas deux fois la même poussière", async () => {
    const user = await createTestUser();
    const first = await createAlbum("rare");
    const second = await createAlbum("rare");
    await setDust(user.id, 150);
    await warmPool();

    const results = await Promise.allSettled([craftAlbum(user.id, first.slug), craftAlbum(user.id, second.slug)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await getDust(user.id)).toBe(50);
  });
});
