import { describe, expect, it } from "vitest";
import { coverFromCaa } from "@/lib/listenbrainz";
import { isStudioAlbum } from "@/lib/musicbrainz";

describe("isStudioAlbum", () => {
  it("garde un album sans type secondaire", () => {
    expect(isStudioAlbum("Album", [])).toBe(true);
    expect(isStudioAlbum("Album", undefined)).toBe(true);
  });

  it("écarte les live, compilations, bandes originales et autres formats", () => {
    expect(isStudioAlbum("Album", ["Live"])).toBe(false);
    expect(isStudioAlbum("Album", ["Compilation"])).toBe(false);
    expect(isStudioAlbum("Album", ["Soundtrack"])).toBe(false);
    expect(isStudioAlbum("Single", [])).toBe(false);
    expect(isStudioAlbum("EP", [])).toBe(false);
    expect(isStudioAlbum(null, [])).toBe(false);
  });
});

describe("coverFromCaa", () => {
  it("construit l'adresse de la pochette choisie par ListenBrainz", () => {
    expect(coverFromCaa("30702389-5c67-4438-9ea0-2351c8de0f1d", 43287476628)).toBe(
      "https://coverartarchive.org/release/30702389-5c67-4438-9ea0-2351c8de0f1d/43287476628-500.jpg",
    );
  });

  it("ne renvoie rien sans image", () => {
    expect(coverFromCaa(null, 123)).toBeNull();
    expect(coverFromCaa("30702389-5c67-4438-9ea0-2351c8de0f1d", null)).toBeNull();
  });
});
