import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { sendVerificationEmail, verifyEmailToken } from "@/lib/email-verification";
import { claimAccountWithGoogle, createGoogleUser, findUserById } from "@/lib/users";
import { createTestUser, resetDatabase } from "./helpers";

// Aucun e-mail n'est envoyé : on récupère le texte du message pour y lire le lien
const sendMail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mailer", () => ({ sendMail }));

async function sendAndReadToken(userId: string, email: string) {
  await sendVerificationEmail(userId, email);
  const { text } = sendMail.mock.lastCall![0] as { text: string };
  return text.match(/token=([\w-]+)/)![1];
}

beforeEach(async () => {
  await resetDatabase();
  sendMail.mockReset();
});

describe("vérification de l'adresse e-mail", () => {
  it("le lien reçu confirme l'adresse, une seule fois", async () => {
    const user = await createTestUser({ verified: false });
    const token = await sendAndReadToken(user.id, user.email);

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: user.email }));
    expect(await verifyEmailToken(token)).toBe(true);
    expect((await findUserById(user.id))?.email_verified_at).toBeInstanceOf(Date);
    expect(await verifyEmailToken(token)).toBe(false);
  });

  it("un nouveau lien remplace le précédent", async () => {
    const user = await createTestUser({ verified: false });
    const oldToken = await sendAndReadToken(user.id, user.email);
    const newToken = await sendAndReadToken(user.id, user.email);

    expect(await verifyEmailToken(oldToken)).toBe(false);
    expect(await verifyEmailToken(newToken)).toBe(true);
  });

  it("refuse un lien expiré ou inventé", async () => {
    const user = await createTestUser({ verified: false });
    const token = await sendAndReadToken(user.id, user.email);
    await db.query("update email_verifications set expires_at = now() - interval '1 minute'");

    expect(await verifyEmailToken(token)).toBe(false);
    expect(await verifyEmailToken("jeton-invente")).toBe(false);
    expect(await verifyEmailToken("")).toBe(false);
    expect((await findUserById(user.id))?.email_verified_at).toBeNull();
  });

  it("ne garde en base que l'empreinte du jeton, pas le jeton lui-même", async () => {
    const user = await createTestUser({ verified: false });
    const token = await sendAndReadToken(user.id, user.email);
    const { rows } = await db.query<{ token_hash: string }>("select token_hash from email_verifications");
    expect(rows[0].token_hash).not.toContain(token);
  });
});

describe("connexion Google sur un compte existant", () => {
  it("reprend un compte à l'adresse non vérifiée : mot de passe supprimé, sessions coupées", async () => {
    const user = await createTestUser({ verified: false });
    await sendVerificationEmail(user.id, user.email);

    await claimAccountWithGoogle(user.id);

    const after = await findUserById(user.id);
    expect(after?.password_hash).toBeNull();
    expect(after?.email_verified_at).toBeInstanceOf(Date);
    expect(after?.session_version).toBe(1);
    const pending = await db.query("select 1 from email_verifications where user_id = $1", [user.id]);
    expect(pending.rowCount).toBe(0);
  });

  it("ne touche pas à un compte dont l'adresse est déjà vérifiée", async () => {
    const user = await createTestUser({ verified: true });
    const before = await findUserById(user.id);

    await claimAccountWithGoogle(user.id);

    expect(await findUserById(user.id)).toEqual(before);
  });

  it("crée les nouveaux comptes Google avec une adresse vérifiée et un pseudo valide", async () => {
    const user = await createGoogleUser("nouveau@example.invalid", "Zoé Dupont-Éléonore");
    expect(user.email_verified_at).toBeInstanceOf(Date);
    expect(user.password_hash).toBeNull();
    expect(user.pseudo).toMatch(/^ZoeDupont-Eleo\d{4}$/);
  });
});
