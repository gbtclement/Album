import { describe, expect, it } from "vitest";
import { RARITY_TIERS, tierForRank, type RarityTier } from "@/lib/rarity";

function countTiers(total: number) {
  const counts = Object.fromEntries(RARITY_TIERS.map((tier) => [tier, 0])) as Record<RarityTier, number>;
  for (let rank = 0; rank < total; rank++) counts[tierForRank(rank, total)] += 1;
  return counts;
}

describe("tierForRank", () => {
  it("répartit un catalogue de 1000 albums selon les parts prévues", () => {
    expect(countTiers(1000)).toEqual({ legendaire: 5, epique: 20, rare: 100, peu_commun: 350, commun: 525 });
  });

  it("donne les paliers les plus rares aux albums les plus écoutés", () => {
    expect(tierForRank(0, 1000)).toBe("legendaire");
    expect(tierForRank(999, 1000)).toBe("commun");
  });

  it("garde au moins un album dans chaque palier rare, même sur un petit catalogue", () => {
    const counts = countTiers(10);
    expect(counts.legendaire).toBe(1);
    expect(counts.epique).toBe(1);
    expect(counts.rare).toBe(1);
  });
});
