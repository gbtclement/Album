import { Pool } from "pg";

// Un seul pool de connexions partagé. On le garde dans globalThis
// pour éviter d'en créer un nouveau à chaque rechargement en développement.
const globalForDb = globalThis as unknown as { dbPool?: Pool };

export const db =
  globalForDb.dbPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = db;
}
