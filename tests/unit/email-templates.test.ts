import { describe, expect, it } from "vitest";
import {
  passwordResetEmail,
  paymentFailedEmail,
  premiumCancelledEmail,
  premiumReceiptEmail,
  premiumStartEmail,
  trialEndingEmail,
} from "@/lib/email-templates";

const link = "https://musicodex.fr/premium";
const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("modèles d'e-mails", () => {
  it("affichent le logo vinyle (image PNG à adresse complète), plus la note de musique", () => {
    const { html } = passwordResetEmail({ pseudo: "Apo", link, minutes: 60 });
    expect(html).toMatch(/<img [^>]*src="https?:\/\/[^"]+\/email\/logo\.png"/);
    expect(html).not.toContain("&#9835;");
  });

  it("protègent le HTML contre un pseudo piégé", () => {
    const { html } = premiumCancelledEmail({ pseudo: "<b>x</b>", link });
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("e-mails de l'abonnement premium", () => {
  it("début avec le mois offert : date du premier prélèvement et prix", () => {
    const mail = premiumStartEmail({ pseudo: "Apo", link, trial: true, renewsAt: day("2026-11-10"), priceCents: 299 });
    expect(mail.subject).toBe("Bienvenue dans Musicodex Premium");
    expect(mail.text).toContain("10 novembre 2026");
    expect(mail.text).toContain("2,99");
    expect(mail.text).toContain("mois offert");
  });

  it("début payant : montant reçu et prochain renouvellement", () => {
    const mail = premiumStartEmail({ pseudo: "Apo", link, trial: false, renewsAt: day("2026-11-10"), priceCents: 299 });
    expect(mail.text).not.toContain("mois offert");
    expect(mail.html).toContain("10 novembre 2026");
  });

  it("reçu de paiement mensuel", () => {
    const mail = premiumReceiptEmail({ pseudo: "Apo", link, amountCents: 299, paidAt: day("2026-11-10"), renewsAt: day("2026-12-10") });
    expect(mail.subject).toBe("Paiement reçu : Musicodex Premium");
    expect(mail.text).toContain("10 novembre 2026");
    expect(mail.text).toContain("10 décembre 2026");
  });

  it("fin du mois offert : date, prix et moyen de résilier", () => {
    const mail = trialEndingEmail({ pseudo: "Apo", link, endsAt: day("2026-11-10"), priceCents: 299 });
    expect(mail.subject).toContain("mois offert");
    expect(mail.text).toContain("10 novembre 2026");
    expect(mail.text).toContain("2,99");
    expect(mail.text).toMatch(/résilier/i);
  });

  it("résiliation : effet immédiat, plus aucun prélèvement", () => {
    const mail = premiumCancelledEmail({ pseudo: "Apo", link });
    expect(mail.subject).toContain("résilié");
    expect(mail.text).toMatch(/plus aucun prélèvement/i);
  });

  it("paiement refusé : premium suspendu, moyen de paiement à mettre à jour", () => {
    const mail = paymentFailedEmail({ pseudo: "Apo", link, amountCents: 299 });
    expect(mail.subject).toContain("Paiement refusé");
    expect(mail.text).toContain("2,99");
  });
});
