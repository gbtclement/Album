import { redis } from "@/lib/redis";

export const MINUTE = 60;
export const HOUR = 60 * MINUTE;

// Compte une tentative dans une fenêtre de temps fixe et dit si la limite est dépassée.
// Le compteur vit dans Redis et disparaît tout seul à la fin de la fenêtre.
// Si Redis ne répond pas, on laisse passer : mieux vaut un site qui marche qu'un site bloqué.
export async function isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const [[, count]] = (await redis
      .multi()
      .incr(`rl:${key}`)
      // NX : la durée n'est fixée qu'à la première tentative de la fenêtre
      .expire(`rl:${key}`, windowSeconds, "NX")
      .exec()) as [[Error | null, number]];
    return count > limit;
  } catch {
    return false;
  }
}

// Remet un compteur à zéro (par exemple après une connexion réussie)
export async function resetRateLimit(key: string) {
  try {
    await redis.del(`rl:${key}`);
  } catch {
    // Pas bloquant : le compteur expirera de lui-même
  }
}

// Adresse IP du visiteur. On prend la dernière valeur de X-Forwarded-For : c'est celle ajoutée
// par le reverse proxy (les précédentes peuvent être inventées par le navigateur).
// Sans reverse proxy, Next.js remplit lui-même l'en-tête s'il est absent.
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").pop()?.trim();
  return last || "inconnue";
}
