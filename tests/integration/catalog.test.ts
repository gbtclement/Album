import { beforeEach, describe, expect, it } from "vitest";
import { catalogTitlesByArtist, recomputeRarity } from "@/lib/catalog";
import { db } from "@/lib/db";
import { RARITY_THRESHOLDS } from "@/lib/rarity";
import { createAlbum, resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

async function tierOf(id: string) {
  const { rows } = await db.query<{ rarity_tier: string }>("select rarity_tier from albums where id = $1", [id]);
  return rows[0].rarity_tier;
}

// Album avec ses écoutes et auditeurs Last.fm
async function albumWith(lastfm: number | null, lastfmListeners: number | null = null) {
  const album = await createAlbum();
  await db.query("update albums set lastfm_playcount = $2, lastfm_listeners = $3 where id = $1", [album.id, lastfm, lastfmListeners]);
  return album.id;
}

describe("rareté selon les écoutes Last.fm (seuils fixes)", () => {
  it("range chaque album dans le palier de ses écoutes", async () => {
    const legend = await albumWith(RARITY_THRESHOLDS.legendaire + 1);
    const epic = await albumWith(RARITY_THRESHOLDS.epique);
    const rare = await albumWith(RARITY_THRESHOLDS.rare + 5);
    const uncommon = await albumWith(RARITY_THRESHOLDS.peu_commun);
    const common = await albumWith(RARITY_THRESHOLDS.peu_commun - 1);

    expect(await recomputeRarity()).toBe(5);

    expect(await tierOf(legend)).toBe("legendaire");
    expect(await tierOf(epic)).toBe("epique");
    expect(await tierOf(rare)).toBe("rare");
    expect(await tierOf(uncommon)).toBe("peu_commun");
    expect(await tierOf(common)).toBe("commun");
  });

  it("ajouter des albums au catalogue ne change pas la rareté des autres", async () => {
    const known = await albumWith(RARITY_THRESHOLDS.rare + 1);
    await recomputeRarity();
    for (let i = 0; i < 20; i++) await albumWith(10_000 + i);
    await recomputeRarity();
    expect(await tierOf(known)).toBe("rare");
  });

  it("plafonne les écoutes en boucle d'une poignée de fans (100 par auditeur)", async () => {
    // Dix fois les écoutes d'un légendaire, mais trop peu d'auditeurs : compté comme un épique
    const looped = await albumWith(RARITY_THRESHOLDS.legendaire * 10, RARITY_THRESHOLDS.epique / 100);
    await recomputeRarity();
    expect(await tierOf(looped)).toBe("epique");
  });

  it("laisse commun un album que Last.fm ne connaît pas", async () => {
    const unknown = (await createAlbum("epique")).id;
    expect(await recomputeRarity()).toBe(0);
    expect(await tierOf(unknown)).toBe("commun");
  });
});

describe("titres du catalogue par artiste", () => {
  it("regroupe les titres sous le nom simplifié de l'artiste", async () => {
    const album = await createAlbum();
    await db.query("update albums set artist = 'Beyoncé', title = 'Lemonade' where id = $1", [album.id]);
    const titles = await catalogTitlesByArtist((artist) => artist.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());
    expect(titles.get("beyonce")).toEqual(["Lemonade"]);
  });
});
