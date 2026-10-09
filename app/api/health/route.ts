import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

// Vérifie que l'application, la base et Redis répondent.
// Utile pour Docker et pour contrôler l'état du site après un déploiement.
export async function GET() {
  const status = { app: "ok", db: "ko", redis: "ko" };

  try {
    await db.query("select 1");
    status.db = "ok";
  } catch {
    // La base ne répond pas : on laisse "ko" dans la réponse
  }

  try {
    await redis.ping();
    status.redis = "ok";
  } catch {
    // Redis ne répond pas : on laisse "ko" dans la réponse
  }

  const healthy = status.db === "ok" && status.redis === "ok";
  return Response.json(status, { status: healthy ? 200 : 503 });
}
