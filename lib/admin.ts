import { deleteAccount } from "@/lib/account";
import { db } from "@/lib/db";
import { isUniqueViolation, isValidPseudo } from "@/lib/users";

// Espace admin (lot ADM1) : comptes des joueurs, premium offert, journal des actions.
// Le rôle est toujours relu en base (getAdmin) : un admin retiré dans la base perd l'accès tout de suite.

export class AdminError extends Error {}

export type Admin = { id: string; pseudo: string };

export const ADMIN_PAGE_SIZE = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_COINS = 10_000_000;
const MAX_PREMIUM_DAYS = 3650;

export async function getAdmin(userId: string | undefined | null): Promise<Admin | null> {
  if (!userId) return null;
  const { rows } = await db.query<Admin>("select id, pseudo from users where id = $1 and role = 'admin'", [userId]);
  return rows[0] ?? null;
}

async function log(admin: Admin, target: { id: string; pseudo: string } | null, action: string, details: Record<string, unknown> = {}) {
  await db.query(
    `insert into admin_actions (admin_id, admin_pseudo, target_id, target_pseudo, action, details)
     values ($1, $2, $3, $4, $5, $6)`,
    [admin.id, admin.pseudo, target?.id ?? null, target?.pseudo ?? null, action, JSON.stringify(details)],
  );
}

export type AdminUserRow = {
  id: string;
  pseudo: string;
  email: string;
  role: string;
  email_verified_at: Date | null;
  created_at: Date;
  last_seen_at: Date | null;
  premium_until: Date | null;
  // Premium en cours (calculé par la base, à son heure)
  premium_active: boolean;
  coins: number;
  cards: number;
};

const USER_LIST_SELECT = `
  select u.id, u.pseudo, u.email, u.role, u.email_verified_at, u.created_at, u.last_seen_at, u.premium_until, coalesce(u.premium_until > now(), false) as premium_active, u.coins,
         coalesce((select sum(count) from user_albums ua where ua.user_id = u.id), 0)::int as cards
  from users u`;

// Recherche dans le pseudo ou l'e-mail ; % et _ tapés par l'admin sont pris au pied de la lettre
export async function listUsers({ query, page }: { query: string; page: number }) {
  const pattern = query.trim() ? `%${query.trim().replace(/[\\%_]/g, (char) => `\\${char}`)}%` : null;
  const where = "($1::text is null or u.pseudo ilike $1 or u.email ilike $1)";
  const offset = (Math.max(1, page) - 1) * ADMIN_PAGE_SIZE;
  const [rows, count] = await Promise.all([
    db.query<AdminUserRow>(`${USER_LIST_SELECT} where ${where} order by u.created_at desc limit $2 offset $3`, [pattern, ADMIN_PAGE_SIZE, offset]),
    db.query<{ total: number }>(`select count(*)::int as total from users u where ${where}`, [pattern]),
  ]);
  return { users: rows.rows, total: count.rows[0].total };
}

export async function getUserForAdmin(id: string) {
  const { rows } = await db.query<AdminUserRow & { premium_trial_used_at: Date | null; albums: number; openings_7d: number }>(
    `select x.*, u.premium_trial_used_at,
            (select count(*) from user_albums ua where ua.user_id = u.id)::int as albums,
            (select count(*) from pack_openings po where po.user_id = u.id and po.opened_at > now() - interval '7 days')::int as openings_7d
     from (${USER_LIST_SELECT} where u.id = $1) x join users u on u.id = x.id`,
    [id],
  );
  return rows[0] ?? null;
}

// Identifiant de compte bien formé (UUID) : sinon la base répondrait par une erreur
export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function targetOf(id: string) {
  if (!isUuid(id)) throw new AdminError("Ce compte n'existe plus.");
  const { rows } = await db.query<{ id: string; pseudo: string; email: string; coins: number; email_verified_at: Date | null }>(
    "select id, pseudo, email, coins, email_verified_at from users where id = $1",
    [id],
  );
  if (!rows[0]) throw new AdminError("Ce compte n'existe plus.");
  return rows[0];
}

export type ProfileChanges = { pseudo: string; email: string; emailVerified: boolean; coins: number };

export async function updateUserProfile(admin: Admin, id: string, changes: ProfileChanges) {
  const pseudo = changes.pseudo.trim();
  const email = changes.email.trim().toLowerCase();
  if (!isValidPseudo(pseudo)) throw new AdminError("Pseudo invalide : 3 à 20 caractères (lettres, chiffres, _ ou -).");
  if (!EMAIL_RE.test(email)) throw new AdminError("Adresse e-mail invalide.");
  if (!Number.isInteger(changes.coins) || changes.coins < 0 || changes.coins > MAX_COINS) {
    throw new AdminError(`Les pièces doivent être un nombre entier entre 0 et ${MAX_COINS.toLocaleString("fr-FR")}.`);
  }
  const before = await targetOf(id);
  try {
    await db.query(
      `update users set pseudo = $2, email = $3, coins = $5,
         email_verified_at = case when $4 then coalesce(email_verified_at, now()) else null end
       where id = $1`,
      [id, pseudo, email, changes.emailVerified, changes.coins],
    );
  } catch (error) {
    if (isUniqueViolation(error)) throw new AdminError("Ce pseudo ou cette adresse e-mail est déjà utilisé par un autre compte.");
    throw error;
  }
  // Journal : seulement ce qui a changé, avant → après
  const diff: Record<string, [unknown, unknown]> = {};
  if (before.pseudo !== pseudo) diff.pseudo = [before.pseudo, pseudo];
  if (before.email !== email) diff.email = [before.email, email];
  if (Boolean(before.email_verified_at) !== changes.emailVerified) diff.email_verifie = [Boolean(before.email_verified_at), changes.emailVerified];
  if (before.coins !== changes.coins) diff.pieces = [before.coins, changes.coins];
  await log(admin, { id, pseudo }, "modification", diff);
}

// Premium offert : ajoute des jours (à partir d'aujourd'hui ou de la fin du premium en cours), 0 le retire.
// Contrairement à l'abonnement, il ne consomme pas le mois offert du joueur (premium_trial_used_at intact).
export async function grantPremium(admin: Admin, id: string, days: number): Promise<Date | null> {
  if (!Number.isInteger(days) || days < 0 || days > MAX_PREMIUM_DAYS) {
    throw new AdminError(`Le nombre de jours doit être un entier entre 0 et ${MAX_PREMIUM_DAYS} (0 pour retirer le premium).`);
  }
  const target = await targetOf(id);
  const { rows } = await db.query<{ premium_until: Date | null }>(
    `update users set premium_until = case when $2::int = 0 then null
       else greatest(now(), coalesce(premium_until, now())) + make_interval(days => $2::int) end
     where id = $1 returning premium_until`,
    [id, days],
  );
  await log(admin, target, days === 0 ? "premium retiré" : "premium offert", days === 0 ? {} : { jours: days, jusqu_au: rows[0].premium_until });
  return rows[0].premium_until;
}

// Déconnecte le joueur de tous ses appareils (les sessions sont revérifiées chaque minute, voir auth.ts)
export async function forceLogout(admin: Admin, id: string) {
  const target = await targetOf(id);
  await db.query("update users set session_version = session_version + 1 where id = $1", [id]);
  await log(admin, target, "déconnexion forcée");
}

export async function deleteUserAsAdmin(admin: Admin, id: string, confirmPseudo: string) {
  if (id === admin.id) throw new AdminError("Tu ne peux pas supprimer ton propre compte depuis l'admin.");
  const target = await targetOf(id);
  if (confirmPseudo.trim().toLowerCase() !== target.pseudo.toLowerCase()) {
    throw new AdminError("Le pseudo tapé ne correspond pas : compte non supprimé.");
  }
  await log(admin, target, "suppression", { email: target.email });
  await deleteAccount(id);
}

export type AdminAction = {
  id: string;
  admin_pseudo: string;
  target_id: string | null;
  target_pseudo: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: Date;
};

export async function listAdminActions({ limit = 100, targetId }: { limit?: number; targetId?: string } = {}) {
  const { rows } = await db.query<AdminAction>(
    `select id, admin_pseudo, target_id, target_pseudo, action, details, created_at from admin_actions
     where ($2::uuid is null or target_id = $2) order by created_at desc, id desc limit $1`,
    [limit, targetId ?? null],
  );
  return rows;
}
