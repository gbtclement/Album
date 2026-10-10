import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteUrl, indexingEnabled, jsonLd } from "@/lib/seo";

afterEach(() => vi.unstubAllEnvs());

describe("absoluteUrl", () => {
  it("assemble l'adresse publique et le chemin, sans double barre oblique", () => {
    vi.stubEnv("PUBLIC_BASE_URL", "https://album.example/");
    expect(absoluteUrl("/packs")).toBe("https://album.example/packs");
  });
});

describe("indexingEnabled", () => {
  it("n'autorise les moteurs de recherche qu'avec SEO_INDEXING=true", () => {
    vi.stubEnv("SEO_INDEXING", "true");
    expect(indexingEnabled()).toBe(true);
    vi.stubEnv("SEO_INDEXING", "1");
    expect(indexingEnabled()).toBe(false);
  });
});

describe("jsonLd", () => {
  it("empêche un titre d'album de fermer la balise <script>", () => {
    const output = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(output).not.toContain("<");
    expect(JSON.parse(output)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});

describe("robots.txt", () => {
  it("bloque tout le site tant que l'indexation n'est pas activée", async () => {
    vi.stubEnv("SEO_INDEXING", "false");
    const { default: robots } = await import("@/app/robots");
    expect((await robots()).rules).toEqual({ userAgent: "*", disallow: "/" });
  });

  it("en production, ouvre le site sauf l'espace joueur et les liens reçus par e-mail", async () => {
    vi.stubEnv("SEO_INDEXING", "true");
    vi.stubEnv("PUBLIC_BASE_URL", "https://album.example");
    const { default: robots } = await import("@/app/robots");
    const result = await robots();
    expect(result.sitemap).toBe("https://album.example/sitemap.xml");
    expect(result.rules).toMatchObject({ allow: "/", disallow: expect.arrayContaining(["/collection", "/nouveau-mot-de-passe", "/api/"]) });
  });
});
