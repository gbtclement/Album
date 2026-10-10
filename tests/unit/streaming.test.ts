import { describe, expect, it } from "vitest";
import { linksFromUrls } from "@/lib/streaming";

describe("linksFromUrls", () => {
  it("reconnaît les liens exacts Spotify, Deezer et YouTube", () => {
    expect(
      linksFromUrls([
        "https://open.spotify.com/album/abc",
        "https://www.deezer.com/fr/album/123",
        "https://www.youtube.com/playlist?list=xyz",
        "https://example.com/autre",
      ]),
    ).toEqual({
      spotify: { url: "https://open.spotify.com/album/abc", exact: true },
      deezer: { url: "https://www.deezer.com/fr/album/123", exact: true },
      youtube: { url: "https://www.youtube.com/playlist?list=xyz", exact: true },
    });
  });

  it("garde le premier lien trouvé pour chaque plateforme", () => {
    const links = linksFromUrls(["https://open.spotify.com/album/premier", "https://open.spotify.com/album/second"]);
    expect(links.spotify?.url).toBe("https://open.spotify.com/album/premier");
  });

  it("ignore une page Deezer qui n'est pas un album", () => {
    expect(linksFromUrls(["https://www.deezer.com/fr/artist/1"])).toEqual({});
  });
});
