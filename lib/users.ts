import { db } from "@/lib/db";

export type UserRow = {
  id: string;
  email: string;
  pseudo: string;
  password_hash: string | null;
  email_verified_at: Date | null;
  session_version: number;
  role: "joueur" | "admin";
};

const USER_COLUMNS = "id, email, pseudo, password_hash, email_verified_at, session_version, role";

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

// Note la visite du joueur (au plus une écriture par jour) : un compte sans visite pendant 3 ans est supprimé (lib/account.ts)
export async function touchLastSeen(id: string) {
  await db.query(
    "update users set last_seen_at = now() where id = $1 and (last_seen_at is null or last_seen_at < now() - interval '1 day')",
    [id],
  );
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
    // L'inscription fait accepter les CGU avant de créer le compte
    `insert into users (email, pseudo, password_hash, email_verified_at, terms_accepted_at, last_seen_at)
     values ($1, $2, $3, case when $4 then now() end, now(), now())
     returning ${USER_COLUMNS}`,
    [email, pseudo, passwordHash, emailVerified],
  );
  return result.rows[0];
}
