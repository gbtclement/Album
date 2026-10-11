import { describe, expect, it } from "vitest";
import { marketFee, sellerReceives } from "@/lib/market-rules";

describe("taxe du marché", () => {
  it("garde 5 % du prix, arrondi à l'unité inférieure", () => {
    expect(marketFee(1000)).toBe(50);
    expect(sellerReceives(1000)).toBe(950);
    expect(marketFee(39)).toBe(1);
    expect(marketFee(19)).toBe(0);
    expect(sellerReceives(1)).toBe(1);
  });
});
