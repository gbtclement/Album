import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getDrawCrop, getTodayDraw, isDrawPending, searchAlbumTitles, submitGuess } from "@/lib/daily-draw";
import { coinsOf, createAlbum, createTestUser, giveAlbum, ownedCount, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

async function drawnAlbumId(userId: string) {
  const { rows } = await db.query<{ album_id: string }>("select album_id from daily_draws where user_id = $1 order by draw_date desc limit 1", [userId]);
  return rows[0].album_id;
}

// Pioche réussie la veille (pour tester les séries)
async function yesterday(userId: string, albumId: string, streak: number) {
  await db.query(
    `insert into daily_draws (user_id, draw_date, album_id, crop_x, crop_y, guess_title, solved, streak, answered_at)
     values ($1, (now() at time zone 'Europe/Paris')::date - 1, $2, 0.1, 0.1, 'x', true, $3, now())`,
    [userId, albumId, streak],
  );
}

describe("pioche du jour", () => {
  it("tire un seul album par jour et ne le révèle pas avant la réponse", async () => {
    const user = await createTestUser();
    await createAlbum();
    await createAlbum();

    const first = await getTodayDraw(user.id);
    const again = await getTodayDraw(user.id);
    expect(again.date).toBe(first.date);
    expect(first.answered).toBe(false);
    expect(first.album).toBeNull();
    expect(JSON.stringify(first)).not.toContain("Album ");
    expect(await isDrawPending(user.id)).toBe(true);

    const crop = await getDrawCrop(user.id);
    expect(crop!.x).toBeGreaterThanOrEqual(0);
    expect(crop!.x + crop!.size).toBeLessThanOrEqual(1);
  });

  it("préfère un album absent de la collection", async () => {
    const user = await createTestUser();
    const owned = await createAlbum();
    const missing = await createAlbum();
    await giveAlbum(user.id, owned.id);

    await getTodayDraw(user.id);
    expect(await drawnAlbumId(user.id)).toBe(missing.id);
  });

  it("une bonne réponse ajoute l'album, une seule réponse par jour", async () => {
    const user = await createTestUser();
    const album = await createAlbum();
    await getTodayDraw(user.id);

    const result = await submitGuess(user.id, album.id);
    expect(result).toMatchObject({ solved: true, streak: 1, isNew: true, bonus: null });
    expect(await ownedCount(user.id, album.id)).toBe(1);
    expect(await isDrawPending(user.id)).toBe(false);

    const view = await getTodayDraw(user.id);
    expect(view.album?.slug).toBe(album.slug);
    await expect(submitGuess(user.id, album.id)).rejects.toThrow("déjà répondu");
  });

  it("une mauvaise réponse ne donne rien et remet la série à zéro", async () => {
    const user = await createTestUser();
    const target = await createAlbum();
    const other = await createAlbum();
    await giveAlbum(user.id, other.id);
    await yesterday(user.id, other.id, 4);

    await getTodayDraw(user.id);
    expect(await drawnAlbumId(user.id)).toBe(target.id);
    const result = await submitGuess(user.id, other.id);
    expect(result).toMatchObject({ solved: false, streak: 0 });
    expect(await ownedCount(user.id, target.id)).toBe(0);
  });

  it("accepte un autre album portant le même titre", async () => {
    const user = await createTestUser();
    const target = await createAlbum();
    const homonym = await createAlbum();
    await db.query("update albums set title = 'Greatest Hits' where id = any($1)", [[target.id, homonym.id]]);
    await giveAlbum(user.id, homonym.id);

    await getTodayDraw(user.id);
    expect((await submitGuess(user.id, homonym.id)).solved).toBe(true);
  });

  it("le 7e jour d'affilée offre un pack Épique, même quand le stock est plein", async () => {
    const user = await createTestUser({ coins: 0 });
    const album = await createAlbum();
    const old = await createAlbum();
    await giveAlbum(user.id, old.id);
    await yesterday(user.id, old.id, 13);
    await db.query("insert into pack_stocks (user_id, stock) values ($1, 10)", [user.id]);

    await getTodayDraw(user.id);
    expect(await submitGuess(user.id, album.id)).toMatchObject({ solved: true, streak: 14, bonus: "epic" });
    const { rows } = await db.query<{ stock: number; bonus_packs: number; epic_packs: number }>(
      "select stock, bonus_packs, epic_packs from pack_stocks where user_id = $1",
      [user.id],
    );
    expect(rows[0]).toEqual({ stock: 10, bonus_packs: 0, epic_packs: 1 });
    expect(await coinsOf(user.id)).toBe(0);
  });

  it("propose d'abord les titres qui commencent par le texte tapé", async () => {
    const a = await createAlbum();
    const b = await createAlbum();
    await db.query("update albums set title = 'Le Capitaine' where id = $1", [a.id]);
    await db.query("update albums set title = 'Capitale' where id = $1", [b.id]);

    const results = await searchAlbumTitles("cap");
    expect(results.map((item) => item.title)).toEqual(["Capitale", "Le Capitaine"]);
    expect(await searchAlbumTitles("c")).toEqual([]);
    expect(await searchAlbumTitles("%")).toEqual([]);
  });
});
