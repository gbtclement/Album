import { beforeEach, describe, expect, it } from "vitest";
import { deleteAccount, exportUserData, purgeInactiveAccounts, USER_TABLES } from "@/lib/account";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { touchLastSeen } from "@/lib/users";
import { createAlbum, createTestUser, giveAlbum, ownedCount, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

const quiet = () => {};

describe("données personnelles (RGPD)", () => {
  it("chaque table qui pointe vers un joueur est exportée et effacée avec lui", async () => {
    const { rows } = await db.query<{ table_name: string; delete_rule: string }>(
      `select distinct tc.table_name, rc.delete_rule
       from information_schema.table_constraints tc
       join information_schema.referential_constraints rc on rc.constraint_name = tc.constraint_name
       join information_schema.constraint_column_usage ccu on ccu.constraint_name = rc.unique_constraint_name
       where tc.constraint_type = 'FOREIGN KEY' and ccu.table_name = 'users'`,
    );
    // Une nouvelle table liée aux joueurs doit être ajoutée à USER_TABLES et à exportUserData
    expect(rows.map((row) => row.table_name).sort()).toEqual(USER_TABLES.filter((table) => table !== "users").sort());
    expect(rows.every((row) => row.delete_rule === "CASCADE")).toBe(true);
  });

  it("exporte le compte et la partie, sans le mot de passe", async () => {
    const user = await createTestUser();
    const friend = await createTestUser();
    const album = await createAlbum("rare");
    await giveAlbum(user.id, album.id, 2);
    await db.query("insert into pack_openings (user_id, album_ids) values ($1, $2)", [user.id, [album.id]]);
    await db.query("insert into friendships (requester_id, addressee_id, status) values ($1, $2, 'accepted')", [user.id, friend.id]);
    await db.query("insert into password_resets (user_id, token_hash, expires_at) values ($1, 'empreinte-secrete', now() + interval '1 hour')", [user.id]);
    await db.query("insert into pack_stocks (user_id, epic_packs, legendary_packs) values ($1, 2, 1)", [user.id]);
    await db.query("update users set premium_until = now() + interval '30 days' where id = $1", [user.id]);

    const data = await exportUserData(user.id);
    expect(data?.packs).toMatchObject({ packs_epiques: 2, packs_legendaires: 1 });
    expect(data?.compte.premium_jusqu_au).toBeInstanceOf(Date);
    await db.query("insert into pass_progress (user_id, season, xp) values ($1, '2026-10-01', 2100)", [user.id]);
    await db.query("insert into pass_claims (user_id, season, tier, track) values ($1, '2026-10-01', 1, 'free')", [user.id]);
    await db.query("update pass_progress set season_points = 40 where user_id = $1", [user.id]);
    await db.query("insert into season_awards (user_id, season, rank, points) values ($1, '2026-10-01', 7, 40)", [user.id]);
    expect((await exportUserData(user.id))?.passe_de_combat).toEqual([
      { saison: "2026-10", xp: 2100, points_classement_saison: 40, place_finale_recompensee: 7, paliers_recuperes: ["1 gratuit"] },
    ]);
    expect(data?.compte).toMatchObject({ pseudo: user.pseudo, email: user.email, connexion: "e-mail et mot de passe" });
    expect(data?.collection).toEqual([expect.objectContaining({ exemplaires: 2, artiste: "Artiste de test" })]);
    expect(data?.ouvertures_de_packs[0].albums).toEqual([expect.stringContaining("Artiste de test")]);
    expect(data?.amis).toEqual([expect.objectContaining({ joueur: friend.pseudo, statut: "accepted", demande_envoyee_par_moi: true })]);
    expect(data?.liens_envoyes_par_email.lien_mot_de_passe_expire_le).toBeInstanceOf(Date);

    const json = JSON.stringify(data);
    expect(json).not.toContain("hash-de-test");
    expect(json).not.toContain("empreinte-secrete");
    expect(await exportUserData("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("supprime le compte et ce qui lui appartient, sans toucher aux autres joueurs", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    const album = await createAlbum();
    await giveAlbum(user.id, album.id);
    await giveAlbum(other.id, album.id);
    await db.query("insert into friendships (requester_id, addressee_id, status) values ($1, $2, 'accepted')", [user.id, other.id]);
    await db.query("insert into trades (proposer_id, receiver_id, offer_coins, request_coins) values ($1, $2, 10, 5)", [other.id, user.id]);
    await db.query("insert into market_sales (album_id, price_coins) values ($1, 50)", [album.id]);
    await redis.set("leaderboard:top:50", "[]");

    expect(await deleteAccount(user.id)).toBe(true);

    expect((await db.query("select 1 from users where id = $1", [user.id])).rowCount).toBe(0);
    expect(await ownedCount(user.id, album.id)).toBe(0);
    expect((await db.query("select 1 from friendships")).rowCount).toBe(0);
    expect((await db.query("select 1 from trades")).rowCount).toBe(0);
    // L'autre joueur garde sa collection ; les ventes passées restent pour la cote (sans lien avec un joueur)
    expect(await ownedCount(other.id, album.id)).toBe(1);
    expect((await db.query("select 1 from market_sales")).rowCount).toBe(1);
    expect(await redis.get("leaderboard:top:50")).toBeNull();
  });

  it("note la dernière visite au plus une fois par jour", async () => {
    const user = await createTestUser();
    await db.query("update users set last_seen_at = now() - interval '2 hours' where id = $1", [user.id]);
    await touchLastSeen(user.id);
    const recent = await db.query<{ old: boolean }>("select last_seen_at < now() - interval '1 hour' as old from users where id = $1", [user.id]);
    expect(recent.rows[0].old).toBe(true);

    await db.query("update users set last_seen_at = now() - interval '2 days' where id = $1", [user.id]);
    await touchLastSeen(user.id);
    const touched = await db.query<{ fresh: boolean }>("select last_seen_at > now() - interval '1 minute' as fresh from users where id = $1", [user.id]);
    expect(touched.rows[0].fresh).toBe(true);
  });

  it("prévient puis supprime un compte inactif, sauf s'il revient", async () => {
    const active = await createTestUser();
    const sleeper = await createTestUser();
    const returning = await createTestUser();
    await db.query("update users set last_seen_at = now() - interval '10 days' where id = $1", [active.id]);
    await db.query("update users set last_seen_at = now() - interval '3 years' + interval '10 days' where id = any($1)", [[sleeper.id, returning.id]]);

    // 1. Absents depuis presque 3 ans : prévenus, pas encore supprimés
    expect(await purgeInactiveAccounts({ log: quiet })).toEqual({ notified: 2, deleted: 0 });
    // Rien de neuf le lendemain : pas de second e-mail
    expect(await purgeInactiveAccounts({ log: quiet })).toEqual({ notified: 0, deleted: 0 });

    // 2. Un des deux revient ; 31 jours plus tard, seul l'autre est supprimé
    await db.query("update users set last_seen_at = now() where id = $1", [returning.id]);
    await db.query(
      `update users set last_seen_at = last_seen_at - interval '31 days', inactivity_notice_at = inactivity_notice_at - interval '31 days'
       where id = $1`,
      [sleeper.id],
    );
    expect(await purgeInactiveAccounts({ log: quiet })).toEqual({ notified: 0, deleted: 1 });

    const { rows } = await db.query<{ id: string }>("select id from users order by id");
    expect(rows.map((row) => row.id).sort()).toEqual([active.id, returning.id].sort());
  });

  it("efface les liens expirés envoyés par e-mail", async () => {
    const user = await createTestUser();
    await db.query("insert into password_resets (user_id, token_hash, expires_at) values ($1, 'x', now() - interval '1 minute')", [user.id]);
    await purgeInactiveAccounts({ log: quiet });
    expect((await db.query("select 1 from password_resets")).rowCount).toBe(0);
  });
});
