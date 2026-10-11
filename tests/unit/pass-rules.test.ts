import { describe, expect, it } from "vitest";
import { PASS_REWARDS, PASS_TIERS, PASS_XP, passLevel, passRewardLabel, seasonEnd, xpForCards } from "@/lib/pass-rules";

describe("passe de combat : règles", () => {
  it("donne de l'XP selon la rareté", () => {
    expect(PASS_XP).toEqual({ commun: 10, peu_commun: 20, rare: 50, epique: 120, legendaire: 300 });
    expect(xpForCards(["commun", "rare", "legendaire"])).toBe(360);
  });

  it("un palier tous les 1 000 XP, 30 au maximum", () => {
    expect(passLevel(0)).toBe(0);
    expect(passLevel(999)).toBe(0);
    expect(passLevel(1000)).toBe(1);
    expect(passLevel(29_999)).toBe(29);
    expect(passLevel(45_000)).toBe(30);
  });

  it("30 paliers de packs seulement, avec les totaux prévus", () => {
    expect(PASS_REWARDS).toHaveLength(PASS_TIERS);
    expect(PASS_REWARDS.map((row) => row.tier)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    const total = (track: "free" | "premium") =>
      PASS_REWARDS.reduce(
        (sum, row) => ({
          classic: sum.classic + (row[track].classic ?? 0),
          solo: sum.solo + (row[track].solo ?? 0),
          epic: sum.epic + (row[track].epic ?? 0),
          legendary: sum.legendary + (row[track].legendary ?? 0),
        }),
        { classic: 0, solo: 0, epic: 0, legendary: 0 },
      );
    expect(total("free")).toEqual({ classic: 4, solo: 24, epic: 2, legendary: 0 });
    expect(total("premium")).toEqual({ classic: 30, solo: 0, epic: 2, legendary: 1 });
    for (const row of PASS_REWARDS) expect(Object.keys({ ...row.free, ...row.premium })).not.toContain("coins");
    expect(passRewardLabel(PASS_REWARDS[29].premium)).toBe("1 pack Légendaire");
  });

  it("la saison finit le 1er du mois suivant (UTC)", () => {
    expect(seasonEnd("2026-12-01").toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
