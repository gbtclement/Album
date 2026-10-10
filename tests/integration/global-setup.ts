import pg from "pg";
import { migrate } from "@/scripts/migrate.mjs";
import { testDatabaseUrl } from "../test-env.mjs";

// Lancé une fois avant les tests d'intégration : crée la base de test si elle n'existe pas,
// puis lui applique les migrations avec le même outil que le jeu.
export default async function setup() {
  const url = new URL(testDatabaseUrl());
  const name = url.pathname.slice(1);

  // Une base ne peut pas se créer elle-même : on passe par la base "postgres", toujours présente
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query("select 1 from pg_database where datname = $1", [name]);
    if (exists.rowCount === 0) await client.query(`create database "${name}"`);
  } finally {
    await client.end();
  }

  await migrate(url.toString(), { log: () => {} });
}
