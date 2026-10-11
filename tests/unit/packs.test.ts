import { afterEach, describe, expect, it, vi } from "vitest";
import { DRAW_RATES, normalizeTitle } from "@/lib/daily-draw-rules";
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

  it.each([
    [399_999, "commun"],
    [400_000, "peu_commun"],
    [700_000, "rare"],
    [880_000, "epique"],
    [970_000, "legendaire"],
  ])("pioche du jour : un tirage de %i donne %s", (roll, tier) => {
    randomInt.mockReturnValue(roll);
    expect(drawTier(DRAW_RATES)).toBe(tier);
  });
});

describe("probabilités de la pioche du jour", () => {
  it("font 100 % et sont plus généreuses que les packs pour les hautes raretés", () => {
    const total = Object.values(DRAW_RATES).reduce((sum, rate) => sum + rate, 0);
    expect(total).toBeCloseTo(1, 10);
    for (const tier of ["rare", "epique", "legendaire"] as const) expect(DRAW_RATES[tier]).toBeGreaterThan(PACK_RATES[tier]);
  });

  it("compare les titres sans majuscules, accents ni espaces en trop", () => {
    expect(normalizeTitle("  Café   Bleu ")).toBe(normalizeTitle("cafe bleu"));
    expect(normalizeTitle("OK Computer")).not.toBe(normalizeTitle("Kid A"));
  });
});
