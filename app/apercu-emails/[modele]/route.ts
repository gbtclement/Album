import {
  type EmailContent,
  inactivityEmail,
  passwordResetEmail,
  paymentFailedEmail,
  premiumCancelledEmail,
  premiumReceiptEmail,
  premiumStartEmail,
  trialEndingEmail,
  verificationEmail,
} from "@/lib/email-templates";
import { PREMIUM_PRICE_CENTS } from "@/lib/premium-offer";
import { absoluteUrl } from "@/lib/seo";

const DAY = 24 * 60 * 60 * 1000;

// Exemples de chaque modèle, avec un joueur fictif
const MODELS: Record<string, () => EmailContent> = {
  verification: () => verificationEmail({ pseudo: "Joueur", link: absoluteUrl("/verifier-email?token=exemple"), hours: 24 }),
  "mot-de-passe": () => passwordResetEmail({ pseudo: "Joueur", link: absoluteUrl("/nouveau-mot-de-passe?token=exemple"), minutes: 60 }),
  inactivite: () => inactivityEmail({ pseudo: "Joueur", link: absoluteUrl("/connexion"), days: 30, years: 3 }),
  "premium-debut-offert": () =>
    premiumStartEmail({ pseudo: "Joueur", link: absoluteUrl("/profil"), trial: true, renewsAt: new Date(Date.now() + 30 * DAY), priceCents: PREMIUM_PRICE_CENTS }),
  "premium-debut-paye": () =>
    premiumStartEmail({ pseudo: "Joueur", link: absoluteUrl("/profil"), trial: false, renewsAt: new Date(Date.now() + 30 * DAY), priceCents: PREMIUM_PRICE_CENTS }),
  "premium-recu": () =>
    premiumReceiptEmail({ pseudo: "Joueur", link: absoluteUrl("/profil"), amountCents: PREMIUM_PRICE_CENTS, paidAt: new Date(), renewsAt: new Date(Date.now() + 30 * DAY) }),
  "premium-fin-offert": () =>
    trialEndingEmail({ pseudo: "Joueur", link: absoluteUrl("/profil"), endsAt: new Date(Date.now() + 3 * DAY), priceCents: PREMIUM_PRICE_CENTS }),
  "premium-resilie": () => premiumCancelledEmail({ pseudo: "Joueur", link: absoluteUrl("/premium") }),
  "premium-paiement-refuse": () => paymentFailedEmail({ pseudo: "Joueur", link: absoluteUrl("/profil"), amountCents: PREMIUM_PRICE_CENTS }),
};

// Aperçu des modèles d'e-mails dans le navigateur, en développement seulement (404 en production) :
// /apercu-emails/<modèle>, par exemple /apercu-emails/verification ou /apercu-emails/premium-recu
export async function GET(_request: Request, { params }: { params: Promise<{ modele: string }> }) {
  if (process.env.NODE_ENV === "production") return new Response("Introuvable", { status: 404 });

  const { modele } = await params;
  const email = MODELS[modele]?.();
  if (!email) return new Response(`Modèles : ${Object.keys(MODELS).join(", ")}`, { status: 404 });

  return new Response(email.html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
}
