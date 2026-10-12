import { describe, expect, it } from "vitest";
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
