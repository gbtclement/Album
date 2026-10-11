import { describe, expect, it } from "vitest";
import { baseTitle, lastfmText, matchVariants } from "@/lib/lastfm-variants";

describe("titres comparables", () => {
  it("remplace les signes typographiques que Last.fm ne reconnaît pas", () => {
    expect(lastfmText("Sgt. Pepper’s Lonely Hearts Club Band")).toBe("Sgt. Pepper's Lonely Hearts Club Band");
    expect(lastfmText("D‐DAY")).toBe("D-DAY");
    expect(lastfmText("Memories…Do Not Open")).toBe("Memories...Do Not Open");
    expect(lastfmText("“Awaken, My Love!”")).toBe('"Awaken, My Love!"');
  });

  it("ignore ce qui est entre parenthèses ou crochets, les accents et la ponctuation", () => {
    expect(baseTitle("Abbey Road (Remastered)")).toBe(baseTitle("Abbey Road"));
    expect(baseTitle("The Beatles (White Album) [Disc 1]")).toBe(baseTitle("The Beatles"));
    expect(baseTitle("Sgt. Pepper’s Lonely Hearts Club Band")).toBe(baseTitle("Sgt. Pepper's Lonely Hearts Club Band (Super Deluxe Edition)"));
    expect(baseTitle("The Beatles 1")).not.toBe(baseTitle("The Beatles"));
  });
});

describe("regroupement des versions d'un album", () => {
  const lastfm = [
    { name: "Abbey Road (Remastered)", playcount: 73_851_902 },
    { name: "The Beatles (Remastered)", playcount: 59_844_173 },
    { name: "Abbey Road", playcount: 55_391_515 },
    { name: "The Beatles", playcount: 18_649_795 },
    { name: "The Beatles (White Album)", playcount: 5_188_625 },
    { name: "Abbey Road (Super Deluxe Edition)", playcount: 8_511_680 },
    { name: "The Beatles 1", playcount: 8_718_291 },
    { name: "The Alternate Abbey Road", playcount: 247_089 },
  ];

  it("additionne les écoutes de toutes les versions et garde la plus écoutée", () => {
    const result = matchVariants(["Abbey Road", "The Beatles"], lastfm);
    expect(result.get("Abbey Road")).toEqual({ playcount: 73_851_902 + 55_391_515 + 8_511_680, top: "Abbey Road (Remastered)", versions: 3 });
    expect(result.get("The Beatles")).toEqual({ playcount: 59_844_173 + 18_649_795 + 5_188_625, top: "The Beatles (Remastered)", versions: 3 });
  });

  it("une version qui est elle-même un album du catalogue lui revient, sans être comptée deux fois", () => {
    const result = matchVariants(["Abbey Road", "Abbey Road (Super Deluxe Edition)"], lastfm);
    expect(result.get("Abbey Road (Super Deluxe Edition)")?.playcount).toBe(8_511_680);
    expect(result.get("Abbey Road")?.playcount).toBe(73_851_902 + 55_391_515);
  });

  it("une version partagée par deux albums du catalogue au même titre de base n'est comptée pour aucun", () => {
    const result = matchVariants(["Live (Paris)", "Live (Tokyo)"], [{ name: "Live (Remastered)", playcount: 100 }]);
    expect(result.size).toBe(0);
  });

  it("album absent de la liste Last.fm : pas de résultat (on le cherchera autrement)", () => {
    expect(matchVariants(["Let It Be"], lastfm).has("Let It Be")).toBe(false);
  });
});
