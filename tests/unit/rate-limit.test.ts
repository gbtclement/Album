import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/rate-limit";

describe("clientIp", () => {
  it("prend la dernière adresse de X-Forwarded-For (celle ajoutée par le reverse proxy)", () => {
    // La première valeur peut être inventée par le visiteur pour échapper aux limites
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("renvoie une valeur fixe quand l'en-tête manque", () => {
    expect(clientIp(new Headers())).toBe("inconnue");
    expect(clientIp(new Headers({ "x-forwarded-for": " " }))).toBe("inconnue");
  });
});
