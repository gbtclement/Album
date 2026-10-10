import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { isResetTokenValid, requestPasswordReset, resetPassword } from "@/lib/password-reset";
import { createTestUser, resetDatabase } from "./helpers";

// Aucun e-mail n'est envoyé : on lit le lien dans le texte du message
const sendMail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mailer", () => ({ sendMail }));

beforeEach(async () => {
  await resetDatabase();
  sendMail.mockReset();
});

async function emailOf(id: string) {
  const { rows } = await db.query<{ email: string }>("select email from users where id = $1", [id]);
  return rows[0].email;
}

async function requestToken(email: string) {
  await requestPasswordReset(email);
  const { text, html } = sendMail.mock.lastCall![0] as { text: string; html: string };
  expect(html).toContain("Choisir un nouveau mot de passe");
  return text.match(/token=([\w-]+)/)![1];
}

describe("mot de passe oublié", () => {
  it("change le mot de passe, vérifie l'adresse et ferme les sessions", async () => {
    const user = await createTestUser({ verified: false });
    const email = await emailOf(user.id);
    const token = await requestToken(email);
    expect(await isResetTokenValid(token)).toBe(true);

    expect(await resetPassword(token, "nouveau-secret")).toBe(email);

    const { rows } = await db.query<{ password_hash: string; email_verified_at: Date | null; session_version: number }>(
      "select password_hash, email_verified_at, session_version from users where id = $1",
      [user.id],
    );
    expect(await bcrypt.compare("nouveau-secret", rows[0].password_hash)).toBe(true);
    expect(rows[0].email_verified_at).not.toBeNull();
    expect(rows[0].session_version).toBe(1);
  });

  it("n'accepte un lien qu'une fois", async () => {
    const user = await createTestUser();
    const token = await requestToken(await emailOf(user.id));
    await resetPassword(token, "premier-secret");

    expect(await isResetTokenValid(token)).toBe(false);
    expect(await resetPassword(token, "second-secret")).toBeNull();
  });

  it("refuse un lien expiré ou remplacé par une nouvelle demande", async () => {
    const user = await createTestUser();
    const email = await emailOf(user.id);
    const old = await requestToken(email);
    const recent = await requestToken(email);
    expect(await resetPassword(old, "secret-123")).toBeNull();

    await db.query("update password_resets set expires_at = now() - interval '1 minute'");
    expect(await resetPassword(recent, "secret-123")).toBeNull();
  });

  it("n'envoie rien pour une adresse inconnue", async () => {
    await requestPasswordReset("personne@exemple.com");
    expect(sendMail).not.toHaveBeenCalled();
  });
});
