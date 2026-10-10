// Applique les migrations SQL de db/migrations qui ne l'ont pas encore été, dans l'ordre des noms de fichiers.
// La table schema_migrations garde la liste des fichiers déjà appliqués.
//
// Lancé automatiquement au démarrage de l'application (développement et production).
// À la main : npm run migrate
//
// Écrit en JavaScript (et non en TypeScript) pour tourner tel quel dans l'image de production,
// qui ne contient ni tsx ni le code source.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");

// Numéro arbitraire du verrou PostgreSQL : si deux serveurs démarrent en même temps,
// le second attend que le premier ait fini au lieu d'appliquer les mêmes migrations.
const LOCK_ID = 4_172_026;

export async function migrate(connectionString, { dir = MIGRATIONS_DIR, log = console.log } = {}) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(
      `create table if not exists schema_migrations (
         name       text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );

    const { rows } = await client.query("select name from schema_migrations");
    const done = new Set(rows.map((row) => row.name));
    const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();

    const applied = [];
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      // Une migration entière, ou rien : en cas d'erreur la base reste comme avant ce fichier
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw new Error(`Migration ${file} échouée : ${error.message}`, { cause: error });
      }
      log(`Migration appliquée : ${file}`);
      applied.push(file);
    }

    if (applied.length === 0) log("Base à jour : aucune migration à appliquer.");
    return applied;
  } finally {
    // Fermer la connexion libère aussi le verrou
    await client.end();
  }
}

// Lancé en ligne de commande (et non importé par un test)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL manquant : impossible d'appliquer les migrations.");
    process.exit(1);
  }
  migrate(process.env.DATABASE_URL).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
