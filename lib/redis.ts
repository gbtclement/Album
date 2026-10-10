import Redis from "ioredis";

// Une seule connexion Redis partagée, gardée dans globalThis comme pour la base.
const globalForRedis = globalThis as unknown as { redisClient?: Redis };

export const redis =
  globalForRedis.redisClient ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    // Échoue vite si Redis est absent, au lieu de réessayer indéfiniment
    maxRetriesPerRequest: 1,
    // Connexion seulement à la première commande (pas au chargement du module, par exemple pendant le build)
    lazyConnect: true,
  });

// Les erreurs de connexion sont gérées par lib/cache.ts : on évite le message "Unhandled error event"
redis.on("error", () => {});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redis;
}
