import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLastfmAlbum, LastfmError, parseAlbumInfo } from "@/lib/lastfm";

describe("parseAlbumInfo", () => {
  it("lit les écoutes et les auditeurs (envoyés en texte par Last.fm)", () => {
    expect(parseAlbumInfo({ album: { playcount: "1234567", listeners: "89012" } })).toEqual({ playcount: 1234567, listeners: 89012 });
  });

  it("ne renvoie rien pour un album sans écoute", () => {
    expect(parseAlbumInfo({ album: { playcount: "0", listeners: "0" } })).toBeNull();
    expect(parseAlbumInfo({})).toBeNull();
  });
});

describe("fetchLastfmAlbum", () => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  beforeEach(() => {
    vi.stubEnv("LASTFM_API_KEY", "cle-de-test");
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("cherche par artiste et titre, avec la correction automatique", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({ album: { playcount: "500", listeners: "50" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchLastfmAlbum("Daft Punk", "Discovery")).toEqual({ playcount: 500, listeners: 50 });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("artist")).toBe("Daft Punk");
    expect(url.searchParams.get("album")).toBe("Discovery");
    expect(url.searchParams.get("autocorrect")).toBe("1");
  });

  it("album introuvable : rien, sans erreur", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ error: 6, message: "Album not found" })));
    expect(await fetchLastfmAlbum("X", "Y")).toBeNull();
  });

  it("trop de requêtes : patiente puis réessaie", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply({ error: 29, message: "Rate limit exceeded" }, 429))
      .mockResolvedValueOnce(reply({ album: { playcount: "10", listeners: "2" } }));
    vi.stubGlobal("fetch", fetchMock);
    const pending = fetchLastfmAlbum("X", "Y");
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ playcount: 10, listeners: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clé refusée : erreur tout de suite", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ error: 10, message: "Invalid API key" }, 403)));
    await expect(fetchLastfmAlbum("X", "Y")).rejects.toBeInstanceOf(LastfmError);
  });

  it("sans clé : erreur explicite", async () => {
    vi.stubEnv("LASTFM_API_KEY", "");
    await expect(fetchLastfmAlbum("X", "Y")).rejects.toThrow("LASTFM_API_KEY");
  });
});
