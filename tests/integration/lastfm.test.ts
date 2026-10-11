import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { albumsToCheck, saveLastfm } from "@/lib/lastfm";
import { createAlbum, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

describe("écoutes Last.fm", () => {
  it("enregistre le résultat, même vide, et ne recherche plus l'album avant le délai", async () => {
    const found = await createAlbum();
    const unknown = await createAlbum();
    const fresh = await createAlbum();
    expect((await albumsToCheck(30, 100)).map((row) => row.id).sort()).toEqual([found.id, unknown.id, fresh.id].sort());

    await saveLastfm(found.id, { playcount: 1_500_000, listeners: 90_000 });
    await saveLastfm(unknown.id, null);
    expect((await albumsToCheck(30, 100)).map((row) => row.id)).toEqual([fresh.id]);

    const { rows } = await db.query<{ lastfm_playcount: string; lastfm_listeners: string }>(
      "select lastfm_playcount, lastfm_listeners from albums where id = $1",
      [found.id],
    );
    expect(rows[0]).toEqual({ lastfm_playcount: "1500000", lastfm_listeners: "90000" });

    // Vérifiés il y a plus de 30 jours : à refaire
    await db.query("update albums set lastfm_checked_at = now() - interval '31 days' where id = $1", [found.id]);
    expect((await albumsToCheck(30, 100)).map((row) => row.id).sort()).toEqual([found.id, fresh.id].sort());
  });
});
