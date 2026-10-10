import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeCallbackUrl } from "@/lib/callback-url";

describe("safeCallbackUrl", () => {
  it("garde un chemin interne au site", () => {
    expect(safeCallbackUrl("/packs")).toBe("/packs");
    expect(safeCallbackUrl("/album/ok-computer?x=1")).toBe("/album/ok-computer?x=1");
  });

  it("refuse les adresses externes (redirection vers un faux site)", () => {
    for (const value of ["https://pirate.example", "//pirate.example", "/\\pirate.example", "javascript:alert(1)"]) {
      expect(safeCallbackUrl(value)).toBe(DEFAULT_AFTER_LOGIN);
    }
  });

  it("ne renvoie pas vers les pages de connexion", () => {
    expect(safeCallbackUrl("/connexion")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeCallbackUrl("/inscription?callbackUrl=/packs")).toBe(DEFAULT_AFTER_LOGIN);
    // Une page dont le nom commence pareil reste autorisée
    expect(safeCallbackUrl("/connexions-amis")).toBe("/connexions-amis");
  });

  it("remplace une valeur absente ou d'un autre type", () => {
    expect(safeCallbackUrl(undefined)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeCallbackUrl(["/packs"])).toBe(DEFAULT_AFTER_LOGIN);
  });
});
