import { db } from "@/lib/db";

export type UserRow = {
  id: string;
  email: string;
  pseudo: string;
  password_hash: string | null;
  email_verified_at: Date | null;
  session_version: number;
};

const USER_COLUMNS = "id, email, pseudo, password_hash, email_verified_at, session_version";

const PSEUDO_RE = /^[A-Za-z0-9_-]{3,20}$/;

export function isValidPseudo(pseudo: string) {
  return PSEUDO_RE.test(pseudo);
}

// Code d'erreur PostgreSQL pour une violation de contrainte d'unicité
export function isUniqueViolation(error: unknown) {
  return (error as { code?: string }).code === "23505";
}

// Même calcul que la fonction SQL canonical_email (migration 013, vérifié par un test) : sert de clé aux limites
// de tentatives, pour qu'écrire test+1@gmail.com, test+2@gmail.com... ne donne pas de nouveaux essais.
export function canonicalEmail(address: string) {
  const lower = address.toLowerCase();
  const at = lower.indexOf("@");
  const rawLocal = at === -1 ? lower : lower.slice(0, at);
  const domain = at === -1 ? "" : lower.slice(at + 1).split("@")[0];
  const local = rawLocal.replace(/\+.*$/, "");
  if (domain === "gmail.com" || domain === "googlemail.com") return `${local.replaceAll(".", "")}@gmail.com`;
  return `${local}@${domain}`;
}

// Recherche par boîte mail réelle (voir canonical_email, migration 013) : test+1@gmail.com et t.est@gmail.com
// retrouvent le compte de test@gmail.com, qui reçoit les mêmes e-mails
export async function findUserByEmail(email: string) {
  const result = await db.query<UserRow>(
    `select ${USER_COLUMNS} from users where email_canonical = canonical_email($1)`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await db.query<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [id]);
  return result.rows[0] ?? null;
}

// Le marché et les échanges sont réservés aux adresses vérifiées : un compte jetable ne peut pas
// servir à faire passer des cartes ou des pièces vers un autre compte.
export const VERIFIED_EMAIL_REQUIRED =
  "Confirme ton adresse e-mail pour utiliser le marché et les échanges : le lien est dans l'e-mail reçu à l'inscription, ou à renvoyer depuis ton profil.";

export async function isEmailVerified(userId: string) {
  const result = await db.query("select 1 from users where id = $1 and email_verified_at is not null", [userId]);
  return (result.rowCount ?? 0) > 0;
}

export async function isPseudoTaken(pseudo: string) {
  const result = await db.query("select 1 from users where lower(pseudo) = lower($1)", [pseudo]);
  return (result.rowCount ?? 0) > 0;
}

export async function createUser({
  email,
  pseudo,
  passwordHash,
  emailVerified = false,
}: {
  email: string;
  pseudo: string;
  passwordHash: string | null;
  emailVerified?: boolean;
}) {
  const result = await db.query<UserRow>(
    `insert into users (email, pseudo, password_hash, email_verified_at)
     values ($1, $2, $3, case when $4 then now() end)
     returning ${USER_COLUMNS}`,
    [email, pseudo, passwordHash, emailVerified],
  );
  return result.rows[0];
}

// Crée un compte après une connexion Google, avec un pseudo généré à partir du nom.
// Google a déjà vérifié l'adresse : le compte est créé vérifié.
export async function createGoogleUser(email: string, name: string) {
  const base =
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9_-]/g, "")
      .slice(0, 14) || "joueur";

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    try {
      return await createUser({
        email,
        pseudo: `${base.padEnd(3, "_")}${suffix}`,
        passwordHash: null,
        emailVerified: true,
      });
    } catch (error) {
      // Pseudo déjà pris : on retente avec un autre suffixe
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Impossible de générer un pseudo unique");
}

// Le vrai propriétaire de l'adresse se connecte avec Google sur un compte dont l'e-mail n'a jamais été vérifié.
// Rien ne prouve que le mot de passe a été choisi par lui (n'importe qui peut s'inscrire avec l'adresse d'un autre) :
// on supprime ce mot de passe, on marque l'adresse vérifiée et on déconnecte toutes les sessions ouvertes.
export async function claimAccountWithGoogle(userId: string) {
  await db.query(
    `update users
     set email_verified_at = now(), password_hash = null, session_version = session_version + 1
     where id = $1 and email_verified_at is null`,
    [userId],
  );
  await db.query("delete from email_verifications where user_id = $1", [userId]);
}
