import { describe, expect, it } from "vitest";
import { craftCost, DUST_PER_DUPLICATE, pressableCopies } from "@/lib/dust-rules";
import { RARITY_TIERS } from "@/lib/rarity";

describe("poussière de vinyle", () => {
  it("fabriquer coûte bien plus cher que ce que rapporte un doublon (légendaire : 10 000)", () => {
    expect(craftCost("legendaire")).toBe(10_000);
    for (const tier of RARITY_TIERS) expect(craftCost(tier)).toBeGreaterThanOrEqual(DUST_PER_DUPLICATE[tier] * 50);
  });

  it("garde toujours un exemplaire, et ceux en vente ou en échange", () => {
    expect(pressableCopies(1, 0)).toBe(0);
    expect(pressableCopies(3, 0)).toBe(2);
    expect(pressableCopies(3, 1)).toBe(2);
    expect(pressableCopies(3, 2)).toBe(1);
    expect(pressableCopies(3, 3)).toBe(0);
  });
});
