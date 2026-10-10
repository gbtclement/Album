import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { migrate } from "@/scripts/migrate.mjs";
import { testDatabaseUrl } from "../test-env.mjs";

// Ces tests utilisent leur propre base vide (album_migrate_test), recréée avant chaque test
const url = new URL(testDatabaseUrl());
url.pathname = url.pathname.replace(/_test$/, "_migrate_test");
const scratchUrl = url.toString();
const scratchName = url.pathname.slice(1);

async function adminQuery(sql: string) {
  const admin = new URL(scratchUrl);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function query<T extends pg.QueryResultRow>(sql: string) {
  const client = new pg.Client({ connectionString: scratchUrl });
  await client.connect();
  try {
    return (await client.query<T>(sql)).rows;
  } finally {
    await client.end();
  }
}

const silent = { log: () => {} };

beforeEach(async () => {
  await adminQuery(`drop database if exists "${scratchName}" with (force)`);
  await adminQuery(`create database "${scratchName}"`);
});

afterAll(async () => {
  await adminQuery(`drop database if exists "${scratchName}" with (force)`);
});

describe("migrate", () => {
  it("applique toutes les migrations sur une base neuve, dans l'ordre, puis plus rien", async () => {
    const files = (await readdir("db/migrations")).filter((file) => file.endsWith(".sql")).sort();

    expect(await migrate(scratchUrl, silent)).toEqual(files);
    expect(await migrate(scratchUrl, silent)).toEqual([]);

    const rows = await query<{ name: string }>("select name from schema_migrations order by name");
    expect(rows.map((row) => row.name)).toEqual(files);
    const tables = await query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_name in ('users', 'email_verifications')",
    );
    expect(tables).toHaveLength(2);
  });

  it("reprend une base créée avant l'outil de migration (tables présentes, aucun suivi)", async () => {
    await migrate(scratchUrl, silent);
    await query("drop table schema_migrations");

    // Les migrations sont écrites pour pouvoir être rejouées : elles sont simplement notées comme appliquées
    const applied = await migrate(scratchUrl, silent);
    expect(applied.length).toBeGreaterThan(0);
    expect(await migrate(scratchUrl, silent)).toEqual([]);
  });

  it("annule entièrement une migration en erreur et garde les précédentes", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "migrations-"));
    try {
      await writeFile(path.join(dir, "001_ok.sql"), "create table premiere (id int);");
      await writeFile(path.join(dir, "002_cassee.sql"), "create table seconde (id int);\nselect * from table_absente;");
      await writeFile(path.join(dir, "003_suivante.sql"), "create table troisieme (id int);");

      await expect(migrate(scratchUrl, { ...silent, dir })).rejects.toThrow(/002_cassee\.sql/);

      const rows = await query<{ name: string }>("select name from schema_migrations");
      expect(rows.map((row) => row.name)).toEqual(["001_ok.sql"]);
      const tables = await query<{ table_name: string }>(
        "select table_name from information_schema.tables where table_name in ('premiere', 'seconde', 'troisieme')",
      );
      // "seconde" a été annulée avec le reste de sa migration, "troisieme" n'a pas été tentée
      expect(tables.map((row) => row.table_name)).toEqual(["premiere"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("n'applique qu'une fois les migrations quand deux serveurs démarrent en même temps", async () => {
    const [first, second] = await Promise.all([migrate(scratchUrl, silent), migrate(scratchUrl, silent)]);
    expect([...first, ...second].sort()).toEqual(
      (await readdir("db/migrations")).filter((file) => file.endsWith(".sql")).sort(),
    );
  });
});
