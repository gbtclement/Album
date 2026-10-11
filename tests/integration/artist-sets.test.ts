import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { setReward } from "@/lib/artist-set-rules";
import { claimArtistSet, countClaimableSets, getArtistSets } from "@/lib/artist-sets";
import type { RarityTier } from "@/lib/rarity";
import { coinsOf, createAlbum, createTestUser, giveAlbum, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

// Albums d'un même artiste, avec les raretés données
async function artistAlbums(artist: string, tiers: RarityTier[]) {
  const albums = [];
  for (const tier of tiers) {
    const album = await createAlbum(tier);
    await db.query("update albums set artist = $2 where id = $1", [album.id, artist]);
    albums.push(album);
  }
  return albums;
}

describe("récompense d'un set", () => {
  it("20 pièces par point de rareté, 100 au minimum, un pack à partir de 8 albums", () => {
    expect(setReward(["commun", "commun", "commun"])).toEqual({ coins: 100, pack: false });
    expect(setReward(["legendaire", "epique", "rare"])).toEqual({ coins: 800, pack: false });
    expect(setReward(Array(8).fill("commun")).pack).toBe(true);
  });
});

describe("collections d'artiste", () => {
  it("liste les sets commencés d'au moins 3 albums, les plus avancés d'abord", async () => {
    const user = await createTestUser();
    const radiohead = await artistAlbums("Radiohead", ["rare", "commun", "commun", "commun"]);
    const muse = await artistAlbums("Muse", ["commun", "commun", "commun"]);
    const duo = await artistAlbums("Duo", ["commun", "commun"]);
    await artistAlbums("Inconnu", ["commun", "commun", "commun"]);
    await giveAlbum(user.id, radiohead[0].id);
    await giveAlbum(user.id, muse[0].id);
    await giveAlbum(user.id, muse[1].id);
    await giveAlbum(user.id, duo[0].id);

    const sets = await getArtistSets(user.id);
    expect(sets.map((set) => [set.artist, set.owned, set.total])).toEqual([
      ["Muse", 2, 3],
      ["Radiohead", 1, 4],
    ]);
  });

  it("donne la récompense une seule fois, set complet seulement", async () => {
    const user = await createTestUser({ coins: 0 });
    const albums = await artistAlbums("Muse", ["epique", "commun", "commun"]);
    await giveAlbum(user.id, albums[0].id);
    await giveAlbum(user.id, albums[1].id);
    await expect(claimArtistSet(user.id, "Muse")).rejects.toThrow("Il te manque");

    await giveAlbum(user.id, albums[2].id);
    expect(await countClaimableSets(user.id)).toBe(1);
    expect(await claimArtistSet(user.id, "Muse")).toMatchObject({ coins: 240, pack: false });
    expect(await coinsOf(user.id)).toBe(240);
    expect(await countClaimableSets(user.id)).toBe(0);
    await expect(claimArtistSet(user.id, "Muse")).rejects.toThrow("déjà récupéré");

    // Le set reste affiché comme récupéré, même après avoir revendu une carte
    await db.query("delete from user_albums where user_id = $1 and album_id = $2", [user.id, albums[0].id]);
    const [set] = await getArtistSets(user.id);
    expect(set).toMatchObject({ artist: "Muse", claimed: true, owned: 2 });
  });

  it("un grand set offre un pack, ou 300 pièces si le stock est plein", async () => {
    const user = await createTestUser({ coins: 0 });
    const albums = await artistAlbums("Grand", Array(8).fill("commun"));
    for (const album of albums) await giveAlbum(user.id, album.id);
    await db.query("insert into pack_stocks (user_id, stock) values ($1, 10)", [user.id]);

    expect(await claimArtistSet(user.id, "Grand")).toMatchObject({ coins: 460, packGiven: false });
    expect(await coinsOf(user.id)).toBe(460);
  });
});
