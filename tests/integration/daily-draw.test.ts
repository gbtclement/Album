import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getDrawCrop, getTodayDraw, isDrawPending, searchAlbumTitles, startNewDraw, submitGuess } from "@/lib/daily-draw";
import { coinsOf, createAlbum, createTestUser, giveAlbum, ownedCount, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

async function drawnAlbumId(userId: string) {
  const { rows } = await db.query<{ album_id: string }>("select album_id from daily_draws where user_id = $1 order by draw_date desc, round desc limit 1", [userId]);
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
    await expect(submitGuess(user.id, album.id)).rejects.toThrow("déjà joué");
  });

  it("trois essais : chaque erreur élargit l'image, la troisième termine la pioche et remet la série à zéro", async () => {
    const user = await createTestUser();
    const target = await createAlbum();
    const other = await createAlbum();
    await giveAlbum(user.id, other.id);
    await yesterday(user.id, other.id, 4);

    await getTodayDraw(user.id);
    expect(await drawnAlbumId(user.id)).toBe(target.id);
    const sizes = [(await getDrawCrop(user.id))!.size];

    expect(await submitGuess(user.id, other.id)).toMatchObject({ solved: false, finished: false, attemptsLeft: 2 });
    sizes.push((await getDrawCrop(user.id))!.size);
    const middle = await getTodayDraw(user.id);
    expect(middle).toMatchObject({ answered: false, attemptsLeft: 2, album: null });
    expect(middle.wrongGuesses).toHaveLength(1);
    expect(await isDrawPending(user.id)).toBe(true);

    expect(await submitGuess(user.id, other.id)).toMatchObject({ finished: false, attemptsLeft: 1 });
    const crop = (await getDrawCrop(user.id))!;
    sizes.push(crop.size);
    expect(sizes).toEqual([0.3, 0.5, 0.75]);
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.size).toBeLessThanOrEqual(1);

    expect(await submitGuess(user.id, other.id)).toMatchObject({ solved: false, finished: true, streak: 0 });
    expect(await ownedCount(user.id, target.id)).toBe(0);
    expect(await isDrawPending(user.id)).toBe(false);
    expect((await getTodayDraw(user.id)).album?.slug).toBe(target.slug);
  });

  it("trouvé au deuxième essai : l'album est gagné et la série continue", async () => {
    const user = await createTestUser();
    const target = await createAlbum();
    const other = await createAlbum();
    await giveAlbum(user.id, other.id);
    await yesterday(user.id, other.id, 2);

    await getTodayDraw(user.id);
    await submitGuess(user.id, other.id);
    expect(await submitGuess(user.id, target.id)).toMatchObject({ solved: true, finished: true, streak: 3 });
    expect(await ownedCount(user.id, target.id)).toBe(1);
  });

  it("pioches illimitées seulement avec DRAW_REPLAY=1 hors production, et la série se suit d'une pioche à l'autre", async () => {
    const user = await createTestUser();
    for (let i = 0; i < 4; i++) await createAlbum();
    const env = process.env as Record<string, string | undefined>;
    const before = { replay: env.DRAW_REPLAY, node: env.NODE_ENV };
    try {
      await getTodayDraw(user.id);
      await expect(startNewDraw(user.id)).rejects.toThrow("Une seule pioche par jour");

      env.DRAW_REPLAY = "1";
      env.NODE_ENV = "production";
      await expect(startNewDraw(user.id)).rejects.toThrow("Une seule pioche par jour");

      env.NODE_ENV = "test";
      // Pioche en cours : on la garde
      expect((await startNewDraw(user.id)).round).toBe(1);
      await submitGuess(user.id, await drawnAlbumId(user.id));
      const second = await startNewDraw(user.id);
      expect(second).toMatchObject({ round: 2, answered: false });
      expect(await isDrawPending(user.id)).toBe(true);
      const { rows } = await db.query<{ album_id: string }>("select album_id from daily_draws where user_id = $1 and round = 2", [user.id]);
      expect(await submitGuess(user.id, rows[0].album_id)).toMatchObject({ solved: true, streak: 2 });
    } finally {
      env.DRAW_REPLAY = before.replay;
      env.NODE_ENV = before.node;
    }
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
