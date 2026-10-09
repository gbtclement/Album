import { redis } from "@/lib/redis";

export const DAY = 60 * 60 * 24;
export const WEEK = DAY * 7;

// Renvoie la valeur mise en cache si elle existe, sinon la charge et la garde.
// Si Redis est indisponible, on charge directement (le cache est une optimisation).
export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch {
    // Redis ne répond pas : on continue sans cache
  }

  const value = await load();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Impossible d'écrire dans le cache : ce n'est pas bloquant
  }
  return value;
}
