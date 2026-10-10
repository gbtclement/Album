import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited, resetRateLimit } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";
import { resetDatabase } from "./helpers";

beforeEach(resetDatabase);

describe("isRateLimited", () => {
  it("laisse passer jusqu'à la limite, puis bloque", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await isRateLimited("test:cle", 3, 60));
    expect(results).toEqual([false, false, false, true]);
  });

  it("fixe la durée de la fenêtre à la première tentative sans la prolonger ensuite", async () => {
    await isRateLimited("test:fenetre", 5, 60);
    await redis.expire("rl:test:fenetre", 10);
    await isRateLimited("test:fenetre", 5, 60);
    expect(await redis.ttl("rl:test:fenetre")).toBeLessThanOrEqual(10);
  });

  it("compte chaque clé séparément et peut être remis à zéro", async () => {
    for (let i = 0; i < 3; i++) await isRateLimited("test:a", 2, 60);
    expect(await isRateLimited("test:b", 2, 60)).toBe(false);

    await resetRateLimit("test:a");
    expect(await isRateLimited("test:a", 2, 60)).toBe(false);
  });
});
