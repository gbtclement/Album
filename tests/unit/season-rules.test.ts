import { describe, expect, it } from "vitest";
import { seasonPoints, seasonReward, seasonRewardLabel } from "@/lib/season-rules";

describe("classement saisonnier : règles", () => {
  it("compte les points de rareté de chaque carte, doublons compris", () => {
    expect(seasonPoints(["commun", "commun", "peu_commun", "rare", "epique", "legendaire"])).toBe(1 + 1 + 2 + 5 + 10 + 25);
  });

  it("récompense le top 20 selon le barème, rien au-delà", () => {
    expect(seasonReward(1)).toEqual({ coins: 3000, classic: 0, epic: 2, legendary: 1 });
    expect(seasonReward(2)).toEqual({ coins: 2000, classic: 0, epic: 1, legendary: 1 });
    expect(seasonReward(3)).toEqual({ coins: 1500, classic: 0, epic: 0, legendary: 1 });
    expect(seasonReward(4)).toEqual({ coins: 750, classic: 0, epic: 1, legendary: 0 });
    expect(seasonReward(10)).toEqual(seasonReward(4));
    expect(seasonReward(11)).toEqual({ coins: 300, classic: 2, epic: 0, legendary: 0 });
    expect(seasonReward(20)).toEqual(seasonReward(11));
    expect(seasonReward(21)).toBeNull();
    expect(seasonReward(0)).toBeNull();
  });

  it("décrit une récompense", () => {
    // Le format français sépare les milliers par une espace fine insécable
    expect(seasonRewardLabel(seasonReward(1)!)).toBe("3 000 pièces + 1 pack Légendaire + 2 packs Épiques");
    expect(seasonRewardLabel(seasonReward(11)!)).toBe("300 pièces + 2 packs");
  });
});
