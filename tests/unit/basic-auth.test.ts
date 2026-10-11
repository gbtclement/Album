import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { checkBasicAuth } from "@/lib/basic-auth";

// Ligne au format .htpasswd (Apache, bcrypt « $2y$ »), comme celle de DOC_HTPASSWD
const HTPASSWD = `musicodex:${bcrypt.hashSync("bon-mot-de-passe", 4).replace(/^\$2[ab]\$/, "$2y$")}`;
const header = (user: string, password: string) => `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

describe("protection par identifiant et mot de passe (.htpasswd)", () => {
  it("laisse passer le bon identifiant et le bon mot de passe", async () => {
    expect(await checkBasicAuth(header("musicodex", "bon-mot-de-passe"), HTPASSWD)).toBe(true);
  });

  it("refuse un mauvais mot de passe ou un mauvais identifiant", async () => {
    expect(await checkBasicAuth(header("musicodex", "faux"), HTPASSWD)).toBe(false);
    expect(await checkBasicAuth(header("autre", "bon-mot-de-passe"), HTPASSWD)).toBe(false);
  });

  it("accepte un mot de passe qui contient « : »", async () => {
    const line = `musicodex:${bcrypt.hashSync("a:b", 4)}`;
    expect(await checkBasicAuth(header("musicodex", "a:b"), line)).toBe(true);
  });

  it("refuse sans en-tête, avec un en-tête mal formé, ou si la protection n'est pas configurée", async () => {
    expect(await checkBasicAuth(null, HTPASSWD)).toBe(false);
    expect(await checkBasicAuth("Bearer abc", HTPASSWD)).toBe(false);
    expect(await checkBasicAuth(header("musicodex", "bon-mot-de-passe"), undefined)).toBe(false);
    expect(await checkBasicAuth(header("musicodex", "bon-mot-de-passe"), "sans-deux-points")).toBe(false);
  });
});
