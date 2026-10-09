import { Pool, type PoolClient } from "pg";

// Un seul pool de connexions partagé. On le garde dans globalThis
// pour éviter d'en créer un nouveau à chaque rechargement en développement.
const globalForDb = globalThis as unknown as { dbPool?: Pool };

export const db =
  globalForDb.dbPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = db;
}

// Exécute plusieurs requêtes en un seul bloc : tout réussit, ou rien n'est écrit
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
