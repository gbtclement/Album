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

export async function findUserByEmail(email: string) {
  const result = await db.query<UserRow>(`select ${USER_COLUMNS} from users where lower(email) = lower($1)`, [email]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await db.query<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [id]);
  return result.rows[0] ?? null;
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
