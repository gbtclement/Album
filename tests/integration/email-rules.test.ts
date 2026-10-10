import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createListing, MarketError } from "@/lib/market";
import { createTrade } from "@/lib/trades";
import { canonicalEmail, createUser, findUserByEmail, isUniqueViolation, VERIFIED_EMAIL_REQUIRED } from "@/lib/users";
import { createAlbum, createTestUser, giveAlbum, makeFriends, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

const SAMPLES = [
  "Test@Gmail.com",
  "t.e.s.t+jeux@gmail.com",
  "test+1@googlemail.com",
  "prenom.nom+album@orange.fr",
  "PRENOM.NOM@Orange.fr",
  "a+b+c@exemple.com",
];

describe("une seule inscription par boîte mail", () => {
  it("calcule la même boîte mail en JavaScript et dans la base", async () => {
    for (const address of SAMPLES) {
      const { rows } = await db.query<{ value: string }>("select canonical_email($1) as value", [address]);
      expect(canonicalEmail(address)).toBe(rows[0].value);
    }
    expect(canonicalEmail("t.e.s.t+jeux@gmail.com")).toBe("test@gmail.com");
    expect(canonicalEmail("prenom.nom+album@orange.fr")).toBe("prenom.nom@orange.fr");
  });

  it("refuse un deuxième compte avec un « + » ou des points Gmail", async () => {
    await createUser({ email: "joueur@gmail.com", pseudo: "joueur1", passwordHash: "x" });
    for (const email of ["joueur+2@gmail.com", "j.o.u.e.u.r@gmail.com", "Joueur@googlemail.com"]) {
      const error = await createUser({ email, pseudo: `autre${email.length}`, passwordHash: "x" }).catch((e: unknown) => e);
      expect(isUniqueViolation(error)).toBe(true);
    }
  });

  it("retrouve le compte d'origine depuis une variante de l'adresse", async () => {
    const user = await createUser({ email: "joueur@gmail.com", pseudo: "joueur1", passwordHash: "x" });
    expect((await findUserByEmail("joueur+album@gmail.com"))?.id).toBe(user.id);
    expect((await findUserByEmail("jou.eur@gmail.com"))?.id).toBe(user.id);
    expect(await findUserByEmail("autre@gmail.com")).toBeNull();
  });
});

describe("marché et échanges réservés aux adresses vérifiées", () => {
  it("refuse une annonce d'un joueur non vérifié", async () => {
    const seller = await createTestUser({ verified: false });
    const album = await createAlbum();
    await giveAlbum(seller.id, album.id);

    await expect(createListing(seller.id, album.slug, { kind: "coins", price: 10 })).rejects.toThrow(MarketError);
    await expect(createListing(seller.id, album.slug, { kind: "coins", price: 10 })).rejects.toThrow(VERIFIED_EMAIL_REQUIRED);
  });

  it("refuse un échange proposé par ou à un joueur non vérifié", async () => {
    const verified = await createTestUser();
    const unverified = await createTestUser({ verified: false });
    await makeFriends(verified.id, unverified.id);
    const side = { albumSlug: null, coins: 10 };

    await expect(createTrade(unverified.id, verified.id, side, { albumSlug: null, coins: 5 })).rejects.toThrow(VERIFIED_EMAIL_REQUIRED);
    await expect(createTrade(verified.id, unverified.id, side, { albumSlug: null, coins: 5 })).rejects.toThrow("pas encore confirmé");
  });
});
