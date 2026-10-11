import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { sendVerificationEmail, verifyEmailToken } from "@/lib/email-verification";
import { findUserById } from "@/lib/users";
import { createTestUser, resetDatabase } from "./helpers";

// Aucun e-mail n'est envoyé : on récupère le texte du message pour y lire le lien
const sendMail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mailer", () => ({ sendMail }));

async function sendAndReadToken(userId: string, email: string) {
  await sendVerificationEmail(userId, email, "Joueur");
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
