import { db } from "@/lib/db";

export type UserRow = {
  id: string;
  email: string;
  pseudo: string;
  password_hash: string | null;
};

const PSEUDO_RE = /^[A-Za-z0-9_-]{3,20}$/;

export function isValidPseudo(pseudo: string) {
  return PSEUDO_RE.test(pseudo);
}

// Code d'erreur PostgreSQL pour une violation de contrainte d'unicité
export function isUniqueViolation(error: unknown) {
  return (error as { code?: string }).code === "23505";
}

export async function findUserByEmail(email: string) {
  const result = await db.query<UserRow>(
    "select id, email, pseudo, password_hash from users where lower(email) = lower($1)",
    [email],
  );
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
}: {
  email: string;
  pseudo: string;
  passwordHash: string | null;
}) {
  const result = await db.query<UserRow>(
    "insert into users (email, pseudo, password_hash) values ($1, $2, $3) returning id, email, pseudo, password_hash",
    [email, pseudo, passwordHash],
  );
  return result.rows[0];
}

// Crée un compte après une connexion Google, avec un pseudo généré à partir du nom
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
      });
    } catch (error) {
      // Pseudo déjà pris : on retente avec un autre suffixe
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Impossible de générer un pseudo unique");
}
