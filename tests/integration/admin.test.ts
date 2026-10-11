import { beforeEach, describe, expect, it } from "vitest";
import {
  AdminError,
  deleteUserAsAdmin,
  forceLogout,
  getAdmin,
  grantPremium,
  listAdminActions,
  listUsers,
  updateUserProfile,
} from "@/lib/admin";
import { db } from "@/lib/db";
import { isTrialAvailable } from "@/lib/premium";
import { findUserById } from "@/lib/users";
import { coinsOf, createTestUser, resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
  await db.query("truncate admin_actions");
});

async function createAdmin() {
  const user = await createTestUser();
  await db.query("update users set role = 'admin' where id = $1", [user.id]);
  return (await getAdmin(user.id))!;
}

describe("rôle admin", () => {
  it("un nouveau compte est joueur ; seul le rôle admin en base ouvre l'admin", async () => {
    const player = await createTestUser();
    expect(await getAdmin(player.id)).toBeNull();
    const admin = await createAdmin();
    expect(admin.pseudo).toMatch(/^joueur/);
  });

  it("la base refuse un rôle inconnu", async () => {
    const player = await createTestUser();
    await expect(db.query("update users set role = 'superadmin' where id = $1", [player.id])).rejects.toThrow();
  });
});

describe("liste des joueurs", () => {
  it("cherche par pseudo ou par e-mail", async () => {
    const a = await createTestUser();
    await createTestUser();
    const byPseudo = await listUsers({ query: a.pseudo, page: 1 });
    expect(byPseudo.users.map((user) => user.id)).toEqual([a.id]);
    const byEmail = await listUsers({ query: a.email.toUpperCase(), page: 1 });
    expect(byEmail.total).toBe(1);
    expect((await listUsers({ query: "", page: 1 })).total).toBe(2);
  });
});

describe("modifier un joueur", () => {
  it("change pseudo, e-mail, vérification et pièces, et l'écrit au journal", async () => {
    const admin = await createAdmin();
    const target = await createTestUser({ coins: 50 });
    await updateUserProfile(admin, target.id, { pseudo: "Nouveau_Nom", email: "nouveau@example.invalid", emailVerified: false, coins: 999 });

    const after = await findUserById(target.id);
    expect(after?.pseudo).toBe("Nouveau_Nom");
    expect(after?.email).toBe("nouveau@example.invalid");
    expect(after?.email_verified_at).toBeNull();
    expect(await coinsOf(target.id)).toBe(999);
    const [entry] = await listAdminActions({ limit: 5 });
    expect(entry).toMatchObject({ action: "modification", target_pseudo: "Nouveau_Nom", admin_pseudo: admin.pseudo });
  });

  it("refuse un pseudo invalide, un e-mail déjà pris ou des pièces négatives", async () => {
    const admin = await createAdmin();
    const target = await createTestUser();
    const other = await createTestUser();
    const base = { pseudo: target.pseudo, email: target.email, emailVerified: true, coins: 10 };
    await expect(updateUserProfile(admin, target.id, { ...base, pseudo: "a b" })).rejects.toBeInstanceOf(AdminError);
    await expect(updateUserProfile(admin, target.id, { ...base, email: other.email })).rejects.toBeInstanceOf(AdminError);
    await expect(updateUserProfile(admin, target.id, { ...base, coins: -5 })).rejects.toBeInstanceOf(AdminError);
  });
});

describe("premium offert par l'admin", () => {
  it("donne des jours de premium sans consommer le mois offert du joueur", async () => {
    const admin = await createAdmin();
    const target = await createTestUser();
    const until = await grantPremium(admin, target.id, 30);
    expect(until!.getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    expect(await isTrialAvailable(target.id)).toBe(true);
  });

  it("0 jour retire le premium", async () => {
    const admin = await createAdmin();
    const target = await createTestUser();
    await grantPremium(admin, target.id, 30);
    expect(await grantPremium(admin, target.id, 0)).toBeNull();
  });
});

describe("déconnexion et suppression", () => {
  it("déconnecte le joueur de tous ses appareils", async () => {
    const admin = await createAdmin();
    const target = await createTestUser();
    await forceLogout(admin, target.id);
    expect((await findUserById(target.id))?.session_version).toBe(1);
  });

  it("supprime un compte après confirmation du pseudo, jamais le sien", async () => {
    const admin = await createAdmin();
    const target = await createTestUser();
    await expect(deleteUserAsAdmin(admin, target.id, "mauvais")).rejects.toBeInstanceOf(AdminError);
    await expect(deleteUserAsAdmin(admin, admin.id, admin.pseudo)).rejects.toBeInstanceOf(AdminError);

    await deleteUserAsAdmin(admin, target.id, target.pseudo);
    expect(await findUserById(target.id)).toBeNull();
    const [entry] = await listAdminActions({ limit: 1 });
    expect(entry).toMatchObject({ action: "suppression", target_pseudo: target.pseudo });
  });
});
