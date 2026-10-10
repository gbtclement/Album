import { afterEach, describe, expect, it, vi } from "vitest";
import { coverWorks } from "@/lib/covers";
import { findDeezerCover } from "@/lib/streaming";

// Pas de Redis dans ces tests : le cache charge directement
vi.mock("@/lib/cache", () => ({
  WEEK: 604800,
  cached: (_key: string, _ttl: number, load: () => Promise<unknown>) => load(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  vi.stubGlobal("fetch", vi.fn(async () => response));
}

describe("findDeezerCover", () => {
  it("prend la pochette de l'album au même titre et au même artiste", async () => {
    stubFetch(
      Response.json({
        data: [
          { title: "Discovery (Live)", link: "x", cover_big: "https://deezer/live.jpg", artist: { name: "Daft Punk" } },
          { title: "Discovery", link: "y", cover_big: "https://deezer/discovery.jpg", artist: { name: "Daft Punk" } },
        ],
      }),
    );
    expect(await findDeezerCover("Daft Punk", "Discovery")).toBe("https://deezer/discovery.jpg");
  });

  it("ne prend pas un autre album par défaut", async () => {
    stubFetch(Response.json({ data: [{ title: "Homework", link: "x", cover_big: "https://deezer/h.jpg", artist: { name: "Daft Punk" } }] }));
    expect(await findDeezerCover("Daft Punk", "Discovery")).toBeNull();
  });
});

describe("coverWorks", () => {
  it("accepte une vraie image", async () => {
    stubFetch(new Response("img", { status: 200, headers: { "content-type": "image/jpeg" } }));
    expect(await coverWorks("https://exemple/ok.jpg")).toBe(true);
  });

  it("refuse une erreur du serveur ou une page qui n'est pas une image", async () => {
    stubFetch(new Response("panne", { status: 500 }));
    expect(await coverWorks("https://exemple/panne.jpg")).toBe(false);
    stubFetch(new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }));
    expect(await coverWorks("https://exemple/page.jpg")).toBe(false);
  });

  it("refuse une adresse injoignable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("réseau"); }));
    expect(await coverWorks("https://exemple/loin.jpg")).toBe(false);
  });
});
