import { afterEach, describe, expect, it, vi } from "vitest";
import { PACK_RATES } from "@/lib/pack-rules";
import { RARITY_TIERS } from "@/lib/rarity";

// Le tirage utilise randomInt de node:crypto : on le remplace pour choisir le résultat
const randomInt = vi.hoisted(() => vi.fn());
vi.mock("node:crypto", async (importOriginal) => ({ ...(await importOriginal<object>()), randomInt }));

const { drawTier } = await import("@/lib/packs");

afterEach(() => randomInt.mockReset());

describe("probabilités des packs", () => {
  it("couvrent tous les paliers et font 100 % au total", () => {
    expect(Object.keys(PACK_RATES).sort()).toEqual([...RARITY_TIERS].sort());
    const total = Object.values(PACK_RATES).reduce((sum, rate) => sum + rate, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe("drawTier", () => {
  it.each([
    [0, "commun"],
    [649_999, "commun"],
    [650_000, "peu_commun"],
    [900_000, "rare"],
    [980_000, "epique"],
    [995_000, "legendaire"],
    [999_999, "legendaire"],
  ])("un tirage de %i donne %s", (roll, tier) => {
    randomInt.mockReturnValue(roll);
    expect(drawTier()).toBe(tier);
  });
});
