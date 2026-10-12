import { describe, expect, it } from "vitest";
import { RARITY_THRESHOLDS, rarityScore, tierForPlays } from "@/lib/rarity";

describe("paliers fixes en écoutes Last.fm", () => {
  it("chaque seuil ouvre son palier, juste en dessous c'est le palier inférieur", () => {
    expect(tierForPlays(RARITY_THRESHOLDS.legendaire)).toBe("legendaire");
    expect(tierForPlays(RARITY_THRESHOLDS.legendaire - 1)).toBe("epique");
    expect(tierForPlays(RARITY_THRESHOLDS.epique)).toBe("epique");
    expect(tierForPlays(RARITY_THRESHOLDS.rare)).toBe("rare");
    expect(tierForPlays(RARITY_THRESHOLDS.peu_commun)).toBe("peu_commun");
    expect(tierForPlays(RARITY_THRESHOLDS.peu_commun - 1)).toBe("commun");
    expect(tierForPlays(0)).toBe("commun");
  });

  it("les seuils montent du commun au légendaire", () => {
    expect(RARITY_THRESHOLDS.peu_commun).toBeLessThan(RARITY_THRESHOLDS.rare);
    expect(RARITY_THRESHOLDS.rare).toBeLessThan(RARITY_THRESHOLDS.epique);
    expect(RARITY_THRESHOLDS.epique).toBeLessThan(RARITY_THRESHOLDS.legendaire);
  });
});

describe("écoutes retenues pour la rareté", () => {
  it("écoutes Last.fm, plafonnées à 100 par auditeur", () => {
    expect(rarityScore({ lastfmPlaycount: 136_000_000, lastfmListeners: 1_900_000 })).toBe(136_000_000);
    // Quelques fans qui tournent en boucle : 1,3 milliard d'écoutes pour 660 000 auditeurs
    expect(rarityScore({ lastfmPlaycount: 1_300_000_000, lastfmListeners: 660_000 })).toBe(66_000_000);
    // Auditeurs inconnus (petit album) : pas de plafond
    expect(rarityScore({ lastfmPlaycount: 400_000, lastfmListeners: null })).toBe(400_000);
  });

  it("album inconnu de Last.fm : 0 (commun)", () => {
    expect(rarityScore({ lastfmPlaycount: null, lastfmListeners: null })).toBe(0);
  });
});
