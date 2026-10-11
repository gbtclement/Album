import { describe, expect, it } from "vitest";
import { passTrackTotal } from "@/lib/pass-rules";
import { formatEuros, PREMIUM_PRICE_CENTS } from "@/lib/premium-offer";

describe("offre premium", () => {
  it("affiche le prix en euros à la française", () => {
    expect(formatEuros(PREMIUM_PRICE_CENTS)).toBe("2,99 €");
    expect(formatEuros(1000)).toBe("10,00 €");
  });

  it("totalise les récompenses de chaque ligne du passe", () => {
    expect(passTrackTotal("premium")).toEqual({ classic: 30, solo: 0, epic: 2, legendary: 1 });
    expect(passTrackTotal("free")).toEqual({ classic: 4, solo: 24, epic: 2, legendary: 0 });
  });
});
