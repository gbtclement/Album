import { beforeEach, describe, expect, it } from "vitest";
import { recomputeRarity, saveListens } from "@/lib/catalog";
import { db } from "@/lib/db";
import { LISTENBRAINZ_TO_LASTFM, RARITY_THRESHOLDS } from "@/lib/rarity";
import { createAlbum, resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

async function mbidOf(id: string) {
  const { rows } = await db.query<{ mbid: string }>("select mbid from albums where id = $1", [id]);
  return rows[0].mbid;
}

async function tierOf(id: string) {
  const { rows } = await db.query<{ rarity_tier: string }>("select rarity_tier from albums where id = $1", [id]);
  return rows[0].rarity_tier;
}

// Album avec ses écoutes Last.fm (et, s'il le faut, ListenBrainz)
async function albumWith(lastfm: number | null, lastfmListeners: number | null = null, listens: number | null = null, listeners: number | null = null) {
  const album = await createAlbum();
  await db.query(
    "update albums set lastfm_playcount = $2, lastfm_listeners = $3, listen_count = $4, listener_count = $5 where id = $1",
    [album.id, lastfm, lastfmListeners, listens, listeners],
  );
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
    const looped = await albumWith(1_300_000_000, 660_000);
    await recomputeRarity();
    expect(await tierOf(looped)).toBe("epique");
  });

  it("estime à partir de ListenBrainz un album que Last.fm ne connaît pas, et laisse commun un album sans aucune donnée", async () => {
    const estimated = await albumWith(null, null, Math.ceil(RARITY_THRESHOLDS.rare / LISTENBRAINZ_TO_LASTFM), 100_000);
    const unknown = (await createAlbum("epique")).id;
    await recomputeRarity();
    expect(await tierOf(estimated)).toBe("rare");
    expect(await tierOf(unknown)).toBe("commun");
  });
});

describe("écoutes ListenBrainz", () => {
  it("enregistre écoutes et auditeurs de chaque album", async () => {
    const album = await createAlbum();
    expect(await saveListens(new Map([[await mbidOf(album.id), { listens: 10_000, listeners: 100 }]]))).toBe(1);
    const { rows } = await db.query<{ listen_count: string; listener_count: string }>(
      "select listen_count, listener_count from albums where id = $1",
      [album.id],
    );
    expect(rows[0]).toEqual({ listen_count: "10000", listener_count: "100" });
  });
});
