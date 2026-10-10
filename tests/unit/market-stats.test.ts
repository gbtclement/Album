import { describe, expect, it } from "vitest";
import { clampDays, DEFAULT_DAYS, MAX_DAYS, variationPercent } from "@/lib/market-stats";

describe("clampDays", () => {
  it("garde une durée valide", () => {
    expect(clampDays("7")).toBe(7);
  });

  it("borne les valeurs hors limites", () => {
    expect(clampDays("0")).toBe(1);
    expect(clampDays("-5")).toBe(1);
    expect(clampDays("100000")).toBe(MAX_DAYS);
    expect(clampDays("2.9")).toBe(2);
  });

  it("utilise la valeur par défaut si le paramètre est absent ou invalide", () => {
    expect(clampDays(null)).toBe(DEFAULT_DAYS);
    expect(clampDays(undefined)).toBe(DEFAULT_DAYS);
    expect(clampDays("abc")).toBe(DEFAULT_DAYS);
  });
});

describe("variationPercent", () => {
  const point = (value: number) => ({ time: "2026-10-10", value, volume: 1 });

  it("calcule la variation entre le premier et le dernier point, arrondie au dixième", () => {
    expect(variationPercent([point(100), point(80), point(150)])).toBe(50);
    expect(variationPercent([point(300), point(200)])).toBe(-33.3);
  });

  it("ne calcule rien sans au moins deux points ou avec un départ à zéro", () => {
    expect(variationPercent([])).toBeNull();
    expect(variationPercent([point(100)])).toBeNull();
    expect(variationPercent([point(0), point(10)])).toBeNull();
  });
});
