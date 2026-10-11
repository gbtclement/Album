import { describe, expect, it } from "vitest";
import { analyzeOpenings, scoreSuspect } from "@/lib/cheat-rules";

const START = new Date("2026-10-05T00:00:00+02:00").getTime();
const MIN = 60_000;

// Robot : ouvre chaque pack 2 à 6 s après sa recharge (toutes les 5 min), jour et nuit, pendant `hours` heures
function botTimes(hours: number) {
  const times: Date[] = [];
  for (let t = START, i = 0; t < START + hours * 60 * MIN; i++) {
    t += 5 * MIN + (2 + (i % 5)) * 1000;
    times.push(new Date(t));
  }
  return times;
}

// Humain : quelques sessions par jour, plusieurs packs d'affilée puis de longues pauses, jamais la nuit
function humanTimes(days: number) {
  const times: Date[] = [];
  for (let d = 0; d < days; d++) {
    for (const [hour, count] of [[8, 3], [12, 2], [19, 5], [22, 2]] as const) {
      for (let k = 0; k < count; k++) times.push(new Date(START + d * 1440 * MIN + hour * 60 * MIN + k * (40 + d * 7 + k * 13) * 1000));
    }
  }
  return times;
}

describe("analyse des ouvertures de packs", () => {
  it("repère le réflexe pile à la recharge, la régularité et l'absence de sommeil d'un robot", () => {
    const signals = analyzeOpenings(botTimes(72));
    expect(signals.reflexShare).toBeGreaterThan(0.9);
    expect(signals.intervalCv).not.toBeNull();
    expect(signals.intervalCv!).toBeLessThan(0.05);
    expect(signals.sleeplessDays).toBeGreaterThanOrEqual(2);
  });

  it("un joueur humain ne déclenche rien", () => {
    const signals = analyzeOpenings(humanTimes(7));
    expect(signals.reflexCount).toBe(0);
    expect(signals.sleeplessDays).toBe(0);
    expect(scoreSuspect({ openings: signals, draws: null, muleAccounts: 0 }).score).toBe(0);
  });

  it("trop peu d'ouvertures : pas de régularité calculée", () => {
    expect(analyzeOpenings(botTimes(0.5)).intervalCv).toBeNull();
  });
});

describe("score de suspicion", () => {
  it("additionne les signaux et explique chacun", () => {
    const { score, reasons } = scoreSuspect({
      openings: analyzeOpenings(botTimes(72)),
      draws: { played: 10, solved: 10, medianAnswerSeconds: 3 },
      muleAccounts: 4,
    });
    expect(score).toBe(100);
    expect(reasons.map((reason) => reason.key)).toEqual(["reflexe", "metronome", "sans-sommeil", "pioche", "mules"]);
    expect(reasons[0].text).toMatch(/recharge/);
  });

  it("une pioche réussie mais lente reste normale", () => {
    const { reasons } = scoreSuspect({ openings: analyzeOpenings([]), draws: { played: 10, solved: 10, medianAnswerSeconds: 45 }, muleAccounts: 0 });
    expect(reasons).toHaveLength(0);
  });

  it("deux comptes mules ne suffisent pas, trois oui", () => {
    const empty = analyzeOpenings([]);
    expect(scoreSuspect({ openings: empty, draws: null, muleAccounts: 2 }).score).toBe(0);
    expect(scoreSuspect({ openings: empty, draws: null, muleAccounts: 3 }).reasons[0].key).toBe("mules");
  });
});
