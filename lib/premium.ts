import { db } from "@/lib/db";

// Compte premium (lot P1) : pas encore de paiement, attribué à la main avec npm run premium.
// Premium tant que premium_until est dans le futur.

export class PremiumError extends Error {}

// Date de fin du premium en cours, null si le joueur n'est pas premium
export async function getPremiumUntil(userId: string): Promise<Date | null> {
  const { rows } = await db.query<{ premium_until: Date }>(
    "select premium_until from users where id = $1 and premium_until > now()",
    [userId],
  );
  return rows[0]?.premium_until ?? null;
}

export async function isPremium(userId: string) {
  return (await getPremiumUntil(userId)) !== null;
}

// Résiliation par le joueur : effet immédiat, tous les avantages premium s'arrêtent tout de suite
// (pas de premium jusqu'à la fin de la période). Les cartes, packs et pièces déjà obtenus restent.
// Renvoie false si le joueur n'était pas premium.
export async function cancelPremium(userId: string): Promise<boolean> {
  const { rowCount } = await db.query("update users set premium_until = null where id = $1 and premium_until > now()", [userId]);
  return (rowCount ?? 0) > 0;
}

// Ajoute `days` jours à partir de la fin du premium en cours (ou de maintenant) ; 0 retire le premium.
// Renvoie la nouvelle date de fin (null si retiré).
export async function setPremium(email: string, days: number): Promise<Date | null> {
  if (!Number.isInteger(days) || days < 0) {
    throw new PremiumError("Le nombre de jours doit être un entier positif (0 pour retirer le premium).");
  }
  const { rows } = await db.query<{ premium_until: Date | null }>(
    `update users set premium_until = case when $2::int = 0 then null
       else greatest(now(), coalesce(premium_until, now())) + make_interval(days => $2::int) end
     where lower(email) = lower($1) returning premium_until`,
    [email, days],
  );
  if (rows.length === 0) throw new PremiumError(`Aucun compte avec l'adresse ${email}.`);
  return rows[0].premium_until;
}
