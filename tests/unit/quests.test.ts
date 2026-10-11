import { describe, expect, it } from "vitest";
import { rewardLabel } from "@/lib/pack-rules";
import { isClaimable, periodStart, PREMIUM_REWARDS, QUESTS } from "@/lib/quests";

describe("periodStart", () => {
  it("journalière : le jour même (UTC)", () => {
    expect(periodStart("daily", new Date("2026-10-10T23:59:00Z"))).toBe("2026-10-10");
  });

  it("hebdomadaire : le lundi de la semaine, dimanche compris", () => {
    // Le 10 octobre 2026 est un samedi
    expect(periodStart("weekly", new Date("2026-10-10T12:00:00Z"))).toBe("2026-10-05");
    expect(periodStart("weekly", new Date("2026-10-11T12:00:00Z"))).toBe("2026-10-05");
    expect(periodStart("weekly", new Date("2026-10-12T00:00:00Z"))).toBe("2026-10-12");
  });

  it("hebdomadaire : une semaine à cheval sur deux mois", () => {
    expect(periodStart("weekly", new Date("2026-11-01T08:00:00Z"))).toBe("2026-10-26");
  });

  it("mensuelle : le 1er du mois", () => {
    expect(periodStart("monthly", new Date("2026-02-28T10:00:00Z"))).toBe("2026-02-01");
  });
});

describe("QUESTS", () => {
  it("ont des clés uniques et des objectifs positifs", () => {
    expect(new Set(QUESTS.map((quest) => quest.key)).size).toBe(QUESTS.length);
    for (const quest of QUESTS) {
      expect(quest.target).toBeGreaterThan(0);
      expect(quest.reward.coins + quest.reward.packs + quest.reward.solo).toBeGreaterThan(0);
    }
  });

  it("rapportent des packs : Solo par jour et par semaine, un pack classique par mois", () => {
    for (const quest of QUESTS.filter((item) => !item.premium)) {
      if (quest.period === "daily") expect(quest.reward).toEqual({ coins: 0, packs: 0, solo: 1 });
      if (quest.period === "weekly") expect(quest.reward).toEqual({ coins: 100, packs: 0, solo: 1 });
      if (quest.period === "monthly") expect(quest.reward).toEqual({ coins: 500, packs: 1, solo: 0 });
    }
  });
});

describe("quêtes premium", () => {
  it("une par période, avec les récompenses prévues", () => {
    const premium = QUESTS.filter((quest) => quest.premium);
    expect(premium.map((quest) => quest.period)).toEqual(["daily", "weekly", "monthly"]);
    expect(PREMIUM_REWARDS).toEqual({
      daily: { coins: 0, packs: 1, solo: 0 },
      weekly: { coins: 200, packs: 2, solo: 0 },
      monthly: { coins: 1000, packs: 0, solo: 0, epic: 1 },
    });
  });

  it("ne se réclament qu'en premium", () => {
    const quest = { progress: 5, target: 5, claimed: false, premium: true };
    expect(isClaimable(quest, false)).toBe(false);
    expect(isClaimable(quest, true)).toBe(true);
    expect(isClaimable({ ...quest, premium: false }, false)).toBe(true);
    expect(isClaimable({ ...quest, claimed: true }, true)).toBe(false);
    expect(isClaimable({ ...quest, progress: 4 }, true)).toBe(false);
  });
});

describe("rewardLabel", () => {
  it("décrit une récompense", () => {
    expect(rewardLabel({ coins: 100, packs: 0, solo: 1 })).toBe("1 pack Solo + 100 pièces");
    expect(rewardLabel({ coins: 500, packs: 1, solo: 0 })).toBe("1 pack + 500 pièces");
  });
});
