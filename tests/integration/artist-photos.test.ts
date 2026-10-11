import { beforeEach, describe, expect, it } from "vitest";
import type { DeezerGet } from "@/lib/artist-photo-rules";
import { syncArtistPhotos } from "@/lib/artist-photos";
import { getArtistSets } from "@/lib/artist-sets";
import { db } from "@/lib/db";
import { createAlbum, createTestUser, giveAlbum, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

const PHOTO = "https://cdn-images.dzcdn.net/images/artist/abc123/1000x1000-000000-80-0-0.jpg";

async function albumBy(artist: string, title: string) {
  const album = await createAlbum();
  await db.query("update albums set artist = $2, title = $3 where id = $1", [album.id, artist, title]);
  return album;
}

// Faux Deezer : seul « Radiohead » existe, avec l'album Kid A. Compte les requêtes.
function fakeDeezer() {
  const calls: string[] = [];
  const get: DeezerGet = async (path) => {
    calls.push(path);
    if (path.startsWith("/search/artist")) {
      return path.includes("Radiohead") ? { data: [{ id: 1, name: "Radiohead", picture_xl: PHOTO, nb_fan: 10 }] } : { data: [] };
    }
    return { data: [{ title: "Kid A" }] };
  };
  return { get, calls };
}

async function photoOf(artist: string) {
  const { rows } = await db.query<{ photo_url: string | null }>("select photo_url from artist_photos where artist = $1", [artist]);
  return rows[0];
}

describe("photos d'artistes", () => {
  it("enregistre la photo trouvée, et note aussi les artistes sans photo", async () => {
    await albumBy("Radiohead", "Kid A");
    await albumBy("Groupe Inconnu", "Premier");
    const { get } = fakeDeezer();

    const result = await syncArtistPhotos({ get, log: () => {}, delayMs: 0 });

    expect(result).toEqual({ checked: 2, found: 1 });
    expect((await photoOf("Radiohead"))?.photo_url).toBe(PHOTO);
    expect((await photoOf("Groupe Inconnu"))?.photo_url).toBeNull();
  });

  it("ne redemande pas un artiste déjà vérifié récemment", async () => {
    await albumBy("Radiohead", "Kid A");
    const first = fakeDeezer();
    await syncArtistPhotos({ get: first.get, log: () => {}, delayMs: 0 });

    const second = fakeDeezer();
    const result = await syncArtistPhotos({ get: second.get, log: () => {}, delayMs: 0 });
    expect(result.checked).toBe(0);
    expect(second.calls).toHaveLength(0);
  });

  it("l'onglet Artistes reçoit la photo, ou rien (l'initiale reste)", async () => {
    const user = await createTestUser();
    for (const title of ["Kid A", "Amnesiac", "In Rainbows"]) await giveAlbum(user.id, (await albumBy("Radiohead", title)).id);
    for (const title of ["Un", "Deux", "Trois"]) await giveAlbum(user.id, (await albumBy("Groupe Inconnu", title)).id);
    await syncArtistPhotos({ get: fakeDeezer().get, log: () => {}, delayMs: 0 });

    const sets = await getArtistSets(user.id);
    expect(sets.find((set) => set.artist === "Radiohead")?.photo).toBe(PHOTO);
    expect(sets.find((set) => set.artist === "Groupe Inconnu")?.photo).toBeNull();
  });
});
