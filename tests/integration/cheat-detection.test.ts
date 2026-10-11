import { beforeEach, describe, expect, it } from "vitest";
import { findSuspects } from "@/lib/cheat-detection";
import { db } from "@/lib/db";
import { createAlbum, createTestUser, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

// Ouvertures toutes les 5 min + quelques secondes, sur les `hours` dernières heures
async function botOpenings(userId: string, hours: number) {
  await db.query(
    `insert into pack_openings (user_id, album_ids, opened_at)
     select $1, '{}', now() - make_interval(secs => g * 304 + (g % 5)) from generate_series(1, $2) g`,
    [userId, Math.floor((hours * 3600) / 304)],
  );
}

// Compte créé il y a quelques jours, qui donne une carte au joueur par un échange à sens unique
async function muleTo(receiverId: string) {
  const mule = await createTestUser();
  await db.query("update users set created_at = now() - interval '3 days' where id = $1", [mule.id]);
  const album = await createAlbum();
  await db.query(
    `insert into trades (proposer_id, receiver_id, offer_album_id, offer_coins, request_album_id, request_coins, status, resolved_at)
     values ($1, $2, $3, 0, null, 1, 'accepted', now())`,
    [mule.id, receiverId, album.id],
  );
  return mule;
}

describe("détection de triche", () => {
  it("classe le robot en tête avec ses raisons, et ignore le joueur normal", async () => {
    const bot = await createTestUser();
    const normal = await createTestUser();
    await botOpenings(bot.id, 60);
    await db.query(
      `insert into pack_openings (user_id, album_ids, opened_at)
       select $1, '{}', now() - make_interval(hours => g * 7, secs => g * 41) from generate_series(1, 20) g`,
      [normal.id],
    );

    const suspects = await findSuspects();
    expect(suspects.map((suspect) => suspect.id)).toEqual([bot.id]);
    expect(suspects[0].reasons.map((reason) => reason.key)).toEqual(expect.arrayContaining(["reflexe", "metronome"]));
    expect(suspects[0].pseudo).toBe(bot.pseudo);
  });

  it("repère un joueur qui reçoit les cartes de 3 comptes récents", async () => {
    const boss = await createTestUser();
    for (let i = 0; i < 3; i++) await muleTo(boss.id);

    const suspects = await findSuspects();
    expect(suspects.map((suspect) => suspect.id)).toEqual([boss.id]);
    expect(suspects[0].reasons[0].key).toBe("mules");
  });

  it("aucune activité : aucun suspect", async () => {
    await createTestUser();
    expect(await findSuspects()).toEqual([]);
  });
});
