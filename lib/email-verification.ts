import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { absoluteUrl } from "@/lib/seo";

const VALIDITY_HOURS = 24;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Crée un nouveau lien de vérification (l'ancien ne marche plus) et l'envoie par e-mail
export async function sendVerificationEmail(userId: string, email: string) {
  const token = randomBytes(32).toString("base64url");
  await db.query(
    `insert into email_verifications (user_id, token_hash, expires_at)
     values ($1, $2, now() + make_interval(hours => $3))
     on conflict (user_id) do update
       set token_hash = excluded.token_hash, expires_at = excluded.expires_at, created_at = now()`,
    [userId, hashToken(token), VALIDITY_HOURS],
  );

  const link = absoluteUrl(`/verifier-email?token=${token}`);
  await sendMail({
    to: email,
    subject: "Album : confirme ton adresse e-mail",
    text:
      `Bienvenue sur Album !\n\nPour confirmer ton adresse e-mail, ouvre ce lien (valable ${VALIDITY_HOURS} heures) :\n${link}\n\n` +
      "Si tu n'as pas créé de compte, ignore simplement ce message.",
  });
}

// Valide le jeton : le lien ne sert qu'une fois. Renvoie false si le lien est inconnu ou expiré.
export async function verifyEmailToken(token: string): Promise<boolean> {
  if (!token) return false;
  const result = await db.query(
    `with used as (
       delete from email_verifications
       where token_hash = $1 and expires_at > now()
       returning user_id
     )
     update users set email_verified_at = coalesce(email_verified_at, now())
     where id in (select user_id from used)`,
    [hashToken(token)],
  );
  return (result.rowCount ?? 0) > 0;
}
