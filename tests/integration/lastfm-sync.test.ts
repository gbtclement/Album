import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { syncLastfm } from "@/lib/lastfm";
import { createAlbum, resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
  vi.stubEnv("LASTFM_API_KEY", "cle-de-test");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function album(artist: string, title: string) {
  const created = await createAlbum();
  await db.query("update albums set artist = $2, title = $3 where id = $1", [created.id, artist, title]);
  return created.id;
}

async function stats(id: string) {
  const { rows } = await db.query<{ lastfm_playcount: string | null; lastfm_listeners: string | null }>(
    "select lastfm_playcount, lastfm_listeners from albums where id = $1",
    [id],
  );
  return { playcount: Number(rows[0].lastfm_playcount), listeners: rows[0].lastfm_listeners === null ? null : Number(rows[0].lastfm_listeners) };
}

// Faux Last.fm : liste des albums des Beatles (avec versions), fiche d'album, et un album introuvable dans la liste
function fakeLastfm() {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: string) => {
    const url = new URL(input);
    const method = url.searchParams.get("method");
    calls.push(`${method}:${url.searchParams.get("album") ?? url.searchParams.get("artist")}`);
    const body =
      method === "artist.gettopalbums"
        ? {
            topalbums: {
              album: [
                { name: "Abbey Road (Remastered)", playcount: "70000000" },
                { name: "Abbey Road", playcount: "50000000" },
                { name: "Sgt. Pepper's Lonely Hearts Club Band", playcount: "30000000" },
              ],
            },
          }
        : url.searchParams.get("album") === "Abbey Road (Remastered)"
          ? { album: { playcount: "70000000", listeners: "1400000" } }
          : url.searchParams.get("album") === "Let It Be"
            ? { album: { playcount: "900000", listeners: "40000" } }
            : { album: { playcount: "30000000", listeners: "900000" } };
    return new Response(JSON.stringify(body));
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

describe("récupération Last.fm par artiste", () => {
  it("additionne les versions, corrige l'apostrophe, estime les auditeurs, et cherche à part les albums absents de la liste", async () => {
    const abbey = await album("The Beatles", "Abbey Road");
    const pepper = await album("The Beatles", "Sgt. Pepper’s Lonely Hearts Club Band");
    const letItBe = await album("The Beatles", "Let It Be");
    const calls = fakeLastfm();

    await syncLastfm({ days: 0, log: () => {}, delayMs: 0 });

    // Abbey Road : 70 M + 50 M ; auditeurs de la version la plus écoutée (1,4 M) étendus au total (× 120/70)
    expect(await stats(abbey)).toEqual({ playcount: 120_000_000, listeners: 2_400_000 });
    expect((await stats(pepper)).playcount).toBe(30_000_000);
    // Absent de la liste de l'artiste : fiche d'album demandée directement ; moins d'un million, pas besoin des auditeurs
    expect(await stats(letItBe)).toEqual({ playcount: 900_000, listeners: 40_000 });
    // Une seule liste par artiste
    expect(calls.filter((call) => call.startsWith("artist.gettopalbums"))).toHaveLength(1);
  });

  it("ne redemande pas un album vérifié depuis moins de 30 jours, même introuvable", async () => {
    await album("The Beatles", "Abbey Road");
    const unknown = await album("Inconnu", "Rien");
    fakeLastfm();
    await syncLastfm({ days: 30, log: () => {}, delayMs: 0 });

    const again = fakeLastfm();
    expect(await syncLastfm({ days: 30, log: () => {}, delayMs: 0 })).toEqual({ checked: 0, found: 0 });
    expect(again).toHaveLength(0);

    // Vérifié il y a plus de 30 jours : à refaire
    await db.query("update albums set lastfm_checked_at = now() - interval '31 days' where id = $1", [unknown]);
    expect((await syncLastfm({ days: 30, log: () => {}, delayMs: 0 })).checked).toBe(1);
  });
});
