import { describe, expect, it } from "vitest";
import { periodStart, QUESTS } from "@/lib/quests";

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
      expect(quest.reward).toBeGreaterThan(0);
    }
  });
});
