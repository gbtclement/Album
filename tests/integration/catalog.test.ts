import { beforeEach, describe, expect, it } from "vitest";
import { recomputeRarity, saveListens } from "@/lib/catalog";
import { db } from "@/lib/db";
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

describe("rareté selon les écoutes ListenBrainz", () => {
  it("rend les albums les plus écoutés les plus rares", async () => {
    // 10 albums : chaque palier rare garde au moins un album (voir tierForRank)
    const albums = [];
    for (let i = 0; i < 10; i++) albums.push(await createAlbum());
    const listens = new Map<string, { listens: number; listeners: number }>();
    for (const [i, album] of albums.entries()) {
      listens.set(await mbidOf(album.id), { listens: (i + 1) * 1000, listeners: (i + 1) * 10 });
    }

    expect(await saveListens(listens)).toBe(10);
    expect(await recomputeRarity()).toBe(10);

    // Le dernier créé a le plus d'écoutes
    expect(await tierOf(albums[9].id)).toBe("legendaire");
    expect(await tierOf(albums[8].id)).toBe("epique");
    expect(await tierOf(albums[7].id)).toBe("rare");
    expect(await tierOf(albums[0].id)).toBe("commun");
    const { rows } = await db.query<{ listen_count: string; listener_count: string }>(
      "select listen_count, listener_count from albums where id = $1",
      [albums[9].id],
    );
    expect(rows[0]).toEqual({ listen_count: "10000", listener_count: "100" });
  });

  it("laisse commun un album sans écoutes connues", async () => {
    const known = await createAlbum();
    const unknown = await createAlbum("epique");
    await saveListens(new Map([[await mbidOf(known.id), { listens: 5000, listeners: 50 }]]));

    await recomputeRarity();

    expect(await tierOf(known.id)).toBe("legendaire");
    expect(await tierOf(unknown.id)).toBe("commun");
  });
});
