import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { passwordResetEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mailer";
import { absoluteUrl } from "@/lib/seo";

export const RESET_VALIDITY_MINUTES = 60;
export const MIN_PASSWORD_LENGTH = 8;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Envoie un lien de réinitialisation si un compte existe avec cette adresse.
// Ne dit jamais si l'adresse est inscrite : la page affiche le même message dans tous les cas.
export async function requestPasswordReset(email: string) {
  const { rows } = await db.query<{ id: string; pseudo: string; email: string }>(
    "select id, pseudo, email from users where email_canonical = canonical_email($1)",
    [email],
  );
  const user = rows[0];
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  await db.query(
    `insert into password_resets (user_id, token_hash, expires_at)
     values ($1, $2, now() + make_interval(mins => $3))
     on conflict (user_id) do update
       set token_hash = excluded.token_hash, expires_at = excluded.expires_at, created_at = now()`,
    [user.id, hashToken(token), RESET_VALIDITY_MINUTES],
  );

  const link = absoluteUrl(`/nouveau-mot-de-passe?token=${token}`);
  await sendMail({ to: user.email, ...passwordResetEmail({ pseudo: user.pseudo, link, minutes: RESET_VALIDITY_MINUTES }) });
}

// Le lien est-il encore valable ? (pour afficher le formulaire ou un message d'erreur)
export async function isResetTokenValid(token: string) {
  if (!token) return false;
  const result = await db.query("select 1 from password_resets where token_hash = $1 and expires_at > now()", [hashToken(token)]);
  return (result.rowCount ?? 0) > 0;
}

// Change le mot de passe avec un lien valable, qui ne sert qu'une fois. Ouvrir le lien prouve que le joueur
// reçoit les e-mails de cette adresse : elle est donc marquée vérifiée. Toutes les sessions ouvertes sont fermées
// (session_version), au cas où quelqu'un d'autre aurait connu l'ancien mot de passe.
// Renvoie l'adresse du compte, ou null si le lien est inconnu ou expiré.
export async function resetPassword(token: string, password: string): Promise<string | null> {
  if (!token) return null;
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.query<{ email: string }>(
    `with used as (
       delete from password_resets
       where token_hash = $1 and expires_at > now()
       returning user_id
     )
     update users
     set password_hash = $2, email_verified_at = coalesce(email_verified_at, now()), session_version = session_version + 1
     where id in (select user_id from used)
     returning email`,
    [hashToken(token), passwordHash],
  );
  const email = result.rows[0]?.email ?? null;
  // Un lien de vérification en attente ne sert plus à rien
  if (email) await db.query("delete from email_verifications where user_id = (select id from users where email = $1)", [email]);
  return email;
}
