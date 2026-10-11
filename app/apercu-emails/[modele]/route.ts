import { inactivityEmail, passwordResetEmail, verificationEmail } from "@/lib/email-templates";
import { absoluteUrl } from "@/lib/seo";

// Aperçu des modèles d'e-mails dans le navigateur, en développement seulement (404 en production) :
// /apercu-emails/verification, /apercu-emails/mot-de-passe et /apercu-emails/inactivite
export async function GET(_request: Request, { params }: { params: Promise<{ modele: string }> }) {
  if (process.env.NODE_ENV === "production") return new Response("Introuvable", { status: 404 });

  const { modele } = await params;
  const email =
    modele === "verification"
      ? verificationEmail({ pseudo: "Joueur", link: absoluteUrl("/verifier-email?token=exemple"), hours: 24 })
      : modele === "mot-de-passe"
        ? passwordResetEmail({ pseudo: "Joueur", link: absoluteUrl("/nouveau-mot-de-passe?token=exemple"), minutes: 60 })
        : modele === "inactivite"
          ? inactivityEmail({ pseudo: "Joueur", link: absoluteUrl("/connexion"), days: 30, years: 3 })
          : null;
  if (!email) return new Response("Modèles : verification, mot-de-passe, inactivite", { status: 404 });

  return new Response(email.html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
}
