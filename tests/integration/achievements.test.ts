import { beforeEach, describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "@/lib/achievement-rules";
import { countAchievements, getAchievements, syncAchievements, takeAchievementNotices } from "@/lib/achievements";
import { db } from "@/lib/db";
import { coinsOf, createAlbum, createTestUser, giveAlbum, makeFriends, resetDatabase, warmPool } from "./helpers";

beforeEach(resetDatabase);

describe("succès", () => {
  it("les clés sont uniques et chaque succès rapporte des pièces", () => {
    expect(new Set(ACHIEVEMENTS.map((item) => item.key)).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS.every((item) => item.reward > 0 && item.target > 0)).toBe(true);
  });

  it("débloque les succès atteints une seule fois et verse leurs pièces", async () => {
    const user = await createTestUser({ coins: 0 });
    const friend = await createTestUser();
    await giveAlbum(user.id, (await createAlbum("legendaire")).id);
    await makeFriends(user.id, friend.id);

    const fresh = await syncAchievements(user.id);
    expect(fresh.map((item) => item.key).sort()).toEqual(["albums_1", "epic_1", "friends_1", "legendary_1", "rare_1"]);
    expect(await coinsOf(user.id)).toBe(50 + 100 + 200 + 500 + 50);

    expect(await syncAchievements(user.id)).toEqual([]);
    expect(await coinsOf(user.id)).toBe(900);

    // Annoncés une seule fois
    expect((await takeAchievementNotices(user.id)).length).toBe(5);
    expect(await takeAchievementNotices(user.id)).toEqual([]);
  });

  it("la liste d'amis met à jour les succès des amis", async () => {
    const user = await createTestUser();
    const friend = await createTestUser();
    await giveAlbum(friend.id, (await createAlbum()).id);
    const counts = await countAchievements([friend.id]);
    expect(counts.get(friend.id)).toBe(1);
    expect((await takeAchievementNotices(friend.id)).map((item) => item.key)).toEqual(["albums_1"]);
    expect(counts.get(user.id)).toBeUndefined();
  });

  it("un succès débloqué le reste, même si la condition n'est plus remplie", async () => {
    const user = await createTestUser();
    const album = await createAlbum();
    await giveAlbum(user.id, album.id);
    await syncAchievements(user.id);
    await db.query("delete from user_albums where user_id = $1", [user.id]);

    const list = await getAchievements(user.id);
    expect(list.find((item) => item.key === "albums_1")?.unlockedAt).toBeInstanceOf(Date);
    expect(list.find((item) => item.key === "albums_100")).toMatchObject({ unlockedAt: null, progress: 0 });
  });

  it("deux pages chargées en même temps ne versent les pièces qu'une fois", async () => {
    const user = await createTestUser({ coins: 0 });
    await giveAlbum(user.id, (await createAlbum()).id);
    await warmPool();
    await Promise.all([syncAchievements(user.id), syncAchievements(user.id), syncAchievements(user.id)]);
    expect(await coinsOf(user.id)).toBe(50);
  });
});
