import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { testDatabaseUrl, testRedisUrl } from "./tests/test-env.mjs";

// Deux groupes de tests :
//  - unit : fonctions pures, sans base ni Redis
//  - integration : vraie base PostgreSQL (album_test) et vrai Redis, vidés avant chaque test
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          // Crée la base de test si besoin et lui applique les migrations
          globalSetup: ["tests/integration/global-setup.ts"],
          // DRAW_REPLAY du .env de développement ignoré : les tests de la pioche l'activent eux-mêmes quand il le faut
          env: { DATABASE_URL: testDatabaseUrl(), REDIS_URL: testRedisUrl(), DRAW_REPLAY: "" },
          // Les fichiers partagent la même base : on les lance l'un après l'autre
          fileParallelism: false,
        },
      },
    ],
  },
});
