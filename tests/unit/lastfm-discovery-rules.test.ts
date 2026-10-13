import { describe, expect, it } from "vitest";
import {
  exactArtistMatches,
  isRealArtist,
  mergeArtists,
  missingGroups,
  parseCandidates,
  popularGroups,
  selectNewAlbums,
} from "@/lib/lastfm-discovery-rules";

const album = (mbid: string, title: string, releaseYear: number | null = 2000) => ({ mbid, title, artist: "Ninho", releaseYear, studioAlbum: true });

describe("popularGroups", () => {
  it("additionne les versions d'un même album et garde ceux assez écoutés, les plus écoutés d'abord", () => {
    const groups = popularGroups(
      [
        { name: "M.I.L.S 3", playcount: 1_500_000 },
        { name: "M.I.L.S 3 (Réédition)", playcount: 400_000 },
        { name: "Destin", playcount: 2_900_000 },
        { name: "Petite mixtape", playcount: 40_000 },
      ],
      100_000,
    );
    expect(groups).toEqual([
      { base: "destin", playcount: 2_900_000 },
      { base: "m i l s 3", playcount: 1_900_000 },
    ]);
  });
});

describe("missingGroups", () => {
  it("écarte les albums déjà au catalogue (même titre de base)", () => {
    const groups = [{ base: "destin", playcount: 2_900_000 }, { base: "jefe", playcount: 1_800_000 }];
    expect(missingGroups(groups, ["Destin (Deluxe)"])).toEqual([{ base: "jefe", playcount: 1_800_000 }]);
    expect(missingGroups(groups, ["Destin", "JEFE"])).toEqual([]);
  });
});

describe("mergeArtists", () => {
  it("fusionne les listes sans doublon (casse et accents ignorés) et garde l'identifiant MusicBrainz connu", () => {
    const merged = mergeArtists([
      [{ name: "Beyoncé", mbid: "" }, { name: "Booba", mbid: "b-1" }],
      [{ name: "beyonce", mbid: "be-1" }, { name: "Ninho", mbid: "" }],
    ]);
    expect(merged).toEqual([
      { name: "Beyoncé", mbid: "be-1" },
      { name: "Booba", mbid: "b-1" },
      { name: "Ninho", mbid: null },
    ]);
  });
});

describe("isRealArtist", () => {
  it("écarte les compilations et artistes inconnus", () => {
    expect(isRealArtist("Various Artists")).toBe(false);
    expect(isRealArtist("[unknown]")).toBe(false);
    expect(isRealArtist("")).toBe(false);
    expect(isRealArtist("Booba")).toBe(true);
  });
});

describe("exactArtistMatches", () => {
  it("garde au plus deux artistes MusicBrainz au nom identique, les mieux classés d'abord", () => {
    const found = exactArtistMatches("Nirvana", [
      { id: "a", name: "Nirvana", score: 100 },
      { id: "b", name: "Nirvana", score: 100 },
      { id: "c", name: "Nirvana", score: 98 },
      { id: "d", name: "Nirvana UK", score: 95 },
    ]);
    expect(found).toEqual(["a", "b"]);
    expect(exactArtistMatches("Beyonce", [{ id: "e", name: "Beyoncé", score: 100 }])).toEqual(["e"]);
  });
});

describe("parseCandidates", () => {
  const valid = { mbid: "8a4f0f5c-6b0f-4b8e-9f3a-1c2d3e4f5a6b", title: "Destin", artist: "Ninho", releaseYear: 2019, playcount: 2_900_000 };

  it("relit la liste enregistrée par le parcours des artistes", () => {
    expect(parseCandidates(JSON.stringify([valid, { ...valid, mbid: "9b4f0f5c-6b0f-4b8e-9f3a-1c2d3e4f5a6b", releaseYear: null }]))).toHaveLength(2);
  });

  it("refuse un fichier abîmé ou d'un autre format", () => {
    expect(() => parseCandidates("{}")).toThrow();
    expect(() => parseCandidates(JSON.stringify([{ ...valid, mbid: "pas-un-uuid" }]))).toThrow(/ligne 1/);
    expect(() => parseCandidates(JSON.stringify([valid, { ...valid, playcount: "beaucoup" }]))).toThrow(/ligne 2/);
  });
});

describe("selectNewAlbums", () => {
  const entries = [
    { name: "Destin", playcount: 2_900_000 },
    { name: "JEFE", playcount: 1_800_000 },
    { name: "Comme prévu", playcount: 90_000 },
    { name: "Greatest Hits", playcount: 5_000_000 },
  ];

  it("garde les albums studio MusicBrainz assez écoutés sur Last.fm et pas encore au catalogue", () => {
    const albums = [album("1", "Destin"), album("2", "Jefe"), album("3", "Comme prévu"), album("4", "Album jamais écouté")];
    expect(selectNewAlbums(albums, entries, 100_000, new Set(["1"]))).toEqual([{ ...album("2", "Jefe"), playcount: 1_800_000 }]);
  });

  it("deux albums studio au même titre : seulement le plus ancien", () => {
    const albums = [album("5", "Destin", 2019), album("6", "Destin", 2010)];
    expect(selectNewAlbums(albums, entries, 100_000, new Set()).map((item) => item.mbid)).toEqual(["6"]);
  });
});
