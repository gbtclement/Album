import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { MAX_STOCK, MAX_STOCK_PREMIUM, PACK_INTERVAL_MS } from "@/lib/pack-rules";
import { getPackState } from "@/lib/packs";
import { cancelPremium, isPremium, PremiumError, setPremium } from "@/lib/premium";
import { createTestUser, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

const longAgo = (PACK_INTERVAL_MS / 60_000) * 100;

async function emptyStockSince(userId: string, minutes: number) {
  await db.query(
    `insert into pack_stocks (user_id, stock, last_recharged_at) values ($1, 0, now() - make_interval(mins => $2))
     on conflict (user_id) do update set stock = 0, last_recharged_at = excluded.last_recharged_at`,
    [userId, minutes],
  );
}

describe("premium", () => {
  it("setPremium prolonge à partir de la date de fin, 0 retire le premium", async () => {
    const user = await createTestUser();
    const first = await setPremium(user.email, 30);
    const second = await setPremium(user.email, 30);
    expect(second!.getTime() - first!.getTime()).toBeGreaterThan(29.9 * 86_400_000);
    expect(await isPremium(user.id)).toBe(true);
    expect(await setPremium(user.email, 0)).toBeNull();
    expect(await isPremium(user.id)).toBe(false);
  });

  it("refuse un e-mail inconnu ou un nombre de jours invalide", async () => {
    await expect(setPremium("personne@example.invalid", 30)).rejects.toBeInstanceOf(PremiumError);
    const user = await createTestUser();
    await expect(setPremium(user.email, -1)).rejects.toBeInstanceOf(PremiumError);
    await expect(setPremium(user.email, 1.5)).rejects.toBeInstanceOf(PremiumError);
    expect(await isPremium(user.id)).toBe(false);
  });

  it("le stock monte à 15 en premium, 10 sinon", async () => {
    const free = await createTestUser();
    const premium = await createTestUser();
    await setPremium(premium.email, 30);
    await emptyStockSince(free.id, longAgo);
    await emptyStockSince(premium.id, longAgo);
    expect(await getPackState(free.id)).toMatchObject({ stock: MAX_STOCK, max: MAX_STOCK });
    expect(await getPackState(premium.id)).toMatchObject({ stock: MAX_STOCK_PREMIUM, max: MAX_STOCK_PREMIUM });
  });

  it("cancelPremium : tous les avantages s'arrêtent tout de suite, les packs gagnés restent", async () => {
    const user = await createTestUser();
    await setPremium(user.email, 30);
    await db.query("insert into pack_stocks (user_id, stock, last_recharged_at, epic_packs) values ($1, 15, now(), 2)", [user.id]);

    expect(await cancelPremium(user.id)).toBe(true);
    expect(await isPremium(user.id)).toBe(false);
    expect(await getPackState(user.id)).toMatchObject({ max: MAX_STOCK, epic: 2 });
    expect(await cancelPremium(user.id)).toBe(false);
  });

  it("premium expiré : le stock au-dessus de 10 est gardé, sans recharge", async () => {
    const user = await createTestUser();
    await db.query("update users set premium_until = now() - interval '1 day' where id = $1", [user.id]);
    await db.query("insert into pack_stocks (user_id, stock, last_recharged_at) values ($1, 14, now() - interval '1 hour')", [user.id]);
    expect(await getPackState(user.id)).toMatchObject({ stock: 14, max: MAX_STOCK, nextPackAt: null });
  });
});
