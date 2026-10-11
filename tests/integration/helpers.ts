import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import type { RarityTier } from "@/lib/rarity";

// Vide la base et Redis de test. Refuse de tourner sur une autre base que *_test,
// pour qu'une erreur de configuration ne puisse jamais effacer les données du jeu.
export async function resetDatabase() {
  const { rows } = await db.query<{ name: string }>("select current_database() as name");
  if (!rows[0].name.endsWith("_test")) {
    throw new Error(`Refus de vider la base "${rows[0].name}" : seules les bases *_test sont vidées par les tests.`);
  }
  // CASCADE vide aussi toutes les tables qui pointent vers les joueurs ou les albums
  await db.query("truncate users, albums, artist_photos cascade");
  await redis.flushdb();
}

// Ouvre plusieurs connexions à l'avance. Sans cela, dans un test de demandes simultanées,
// la première finit pendant que la seconde ouvre encore sa connexion : il n'y a jamais de vraie course.
export async function warmPool(connections = 5) {
  await Promise.all(Array.from({ length: connections }, () => db.query("select pg_sleep(0.05)")));
}

let counter = 0;

export async function createTestUser({ coins = 1000, verified = true, password = true } = {}) {
  counter += 1;
  const pseudo = `joueur${counter}`;
  const { rows } = await db.query<{ id: string; email: string; pseudo: string }>(
    `insert into users (email, pseudo, password_hash, coins, email_verified_at)
     values ($1, $2, $3, $4, case when $5 then now() end)
     returning id, email, pseudo`,
    [`${pseudo}@example.invalid`, pseudo, password ? "hash-de-test" : null, coins, verified],
  );
  return rows[0];
}

export async function createAlbum(tier: RarityTier = "commun") {
  counter += 1;
  const { rows } = await db.query<{ id: string; slug: string }>(
    `insert into albums (mbid, slug, title, artist, cover_url, rarity_tier)
     values ($1, $2, $3, 'Artiste de test', 'https://example.invalid/cover.jpg', $4)
     returning id, slug`,
    [randomUUID(), `album-${counter}`, `Album ${counter}`, tier],
  );
  return rows[0];
}

export async function giveAlbum(userId: string, albumId: string, count = 1) {
  await db.query("insert into user_albums (user_id, album_id, count) values ($1, $2, $3)", [userId, albumId, count]);
}

export async function ownedCount(userId: string, albumId: string) {
  const { rows } = await db.query<{ count: number }>(
    "select count from user_albums where user_id = $1 and album_id = $2",
    [userId, albumId],
  );
  return rows[0]?.count ?? 0;
}

export async function coinsOf(userId: string) {
  const { rows } = await db.query<{ coins: number }>("select coins from users where id = $1", [userId]);
  return rows[0].coins;
}

export async function makeFriends(a: string, b: string) {
  await db.query("insert into friendships (requester_id, addressee_id, status) values ($1, $2, 'accepted')", [a, b]);
}
