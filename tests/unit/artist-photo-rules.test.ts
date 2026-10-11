import { describe, expect, it } from "vitest";
import { type DeezerGet, findDeezerArtist, normalizeName, usablePicture } from "@/lib/artist-photo-rules";

// Faux Deezer : résultats de recherche et albums de chaque artiste
function fakeDeezer(artists: Array<{ id: number; name: string; picture_xl: string; nb_fan: number; albums: string[] }>): DeezerGet {
  return async (path) => {
    if (path.startsWith("/search/artist")) {
      return { data: artists.map(({ id, name, picture_xl, nb_fan }) => ({ id, name, picture_xl, nb_fan })) };
    }
    const id = Number(path.match(/^\/artist\/(\d+)\/albums/)?.[1]);
    const artist = artists.find((item) => item.id === id);
    return { data: (artist?.albums ?? []).map((title) => ({ title })) };
  };
}

const PHOTO = "https://cdn-images.dzcdn.net/images/artist/0d58cfbc90f2e776608bcdc0c45a4711/1000x1000-000000-80-0-0.jpg";

describe("noms et titres comparables", () => {
  it("ignore majuscules, accents, ponctuation et mentions entre parenthèses", () => {
    expect(normalizeName("Beyoncé")).toBe(normalizeName("BEYONCE"));
    expect(normalizeName("OK Computer (Remastered)")).toBe(normalizeName("OK Computer"));
    expect(normalizeName("Simon & Garfunkel")).toBe(normalizeName("Simon and Garfunkel"));
    expect(normalizeName("AC/DC")).toBe(normalizeName("AC-DC"));
  });
});

describe("photo Deezer utilisable", () => {
  it("refuse l'image par défaut de Deezer (adresse sans identifiant d'image)", () => {
    expect(usablePicture("https://e-cdns-images.dzcdn.net/images/artist//1000x1000-000000-80-0-0.jpg")).toBeNull();
    expect(usablePicture("")).toBeNull();
    expect(usablePicture(PHOTO)).toBe(PHOTO);
  });
});

describe("le bon artiste chez Deezer", () => {
  it("prend l'artiste du même nom qui a un album de notre catalogue", async () => {
    const get = fakeDeezer([
      { id: 1, name: "Radiohead", picture_xl: PHOTO, nb_fan: 5_000_000, albums: ["OK Computer OKNOTOK 1997 2017", "Kid A"] },
    ]);
    expect(await findDeezerArtist("Radiohead", ["OK Computer", "Kid A"], get)).toEqual({ id: 1, picture: PHOTO });
  });

  it("écarte un homonyme sans album commun et garde le bon", async () => {
    const get = fakeDeezer([
      { id: 7, name: "Nirvana", picture_xl: `${PHOTO}?faux`, nb_fan: 9_000_000, albums: ["Local Anaesthetic"] },
      { id: 8, name: "Nirvana", picture_xl: PHOTO, nb_fan: 8_000_000, albums: ["Nevermind", "In Utero"] },
    ]);
    expect(await findDeezerArtist("Nirvana", ["Nevermind"], get)).toEqual({ id: 8, picture: PHOTO });
  });

  it("aucune photo si aucun album ne correspond (on ne devine pas)", async () => {
    const get = fakeDeezer([{ id: 3, name: "Genesis", picture_xl: PHOTO, nb_fan: 10, albums: ["Autre chose"] }]);
    expect(await findDeezerArtist("Genesis", ["Selling England by the Pound"], get)).toBeNull();
  });

  it("aucune photo si le nom ne correspond pas exactement", async () => {
    const get = fakeDeezer([{ id: 4, name: "Jay-Z", picture_xl: PHOTO, nb_fan: 10, albums: ["Watch the Throne"] }]);
    expect(await findDeezerArtist("Jay-Z & Kanye West", ["Watch the Throne"], get)).toBeNull();
  });

  it("artiste trouvé mais sans vraie photo : rien", async () => {
    const get = fakeDeezer([{ id: 5, name: "Inconnu", picture_xl: "https://e-cdns-images.dzcdn.net/images/artist//1000x1000.jpg", nb_fan: 1, albums: ["Premier"] }]);
    expect(await findDeezerArtist("Inconnu", ["Premier"], get)).toBeNull();
  });
});
