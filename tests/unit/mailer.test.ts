import { describe, expect, it } from "vitest";
import { smtpConfig } from "@/lib/mailer";

describe("configuration SMTP", () => {
  it("n'envoie rien sans serveur (développement)", () => {
    expect(smtpConfig({})).toBeNull();
  });

  it("lit les réglages Brevo, port 587 par défaut", () => {
    expect(smtpConfig({ SMTP_HOST: "smtp-relay.brevo.com", SMTP_USER: "123abc@smtp-brevo.com", SMTP_PASS: "cle" })).toEqual({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user: "123abc@smtp-brevo.com", pass: "cle" },
    });
  });

  it("passe en connexion chiffrée directe sur le port 465", () => {
    expect(smtpConfig({ SMTP_HOST: "smtp.exemple.fr", SMTP_PORT: "465", SMTP_USER: "u", SMTP_PASS: "p" })?.secure).toBe(true);
  });
});
