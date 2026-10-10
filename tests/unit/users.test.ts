import { describe, expect, it } from "vitest";
import { isUniqueViolation, isValidPseudo } from "@/lib/users";

describe("isValidPseudo", () => {
  it("accepte lettres, chiffres, tiret et souligné, de 3 à 20 caractères", () => {
    expect(isValidPseudo("Joueur_42")).toBe(true);
    expect(isValidPseudo("abc")).toBe(true);
    expect(isValidPseudo("a".repeat(20))).toBe(true);
  });

  it("refuse les pseudos trop courts, trop longs ou avec d'autres caractères", () => {
    for (const pseudo of ["ab", "a".repeat(21), "avec espace", "accentué", "<script>"]) {
      expect(isValidPseudo(pseudo)).toBe(false);
    }
  });
});

describe("isUniqueViolation", () => {
  it("reconnaît le code PostgreSQL des doublons", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("autre"))).toBe(false);
  });
});
