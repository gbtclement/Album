import nodemailer from "nodemailer";
import type { EmailContent } from "@/lib/email-templates";

type Mail = EmailContent & { to: string };

// Serveur d'envoi (Brevo en production : smtp-relay.brevo.com, port 587, identifiant et clé SMTP du compte).
// Sans SMTP_HOST (en développement), pas de serveur : voir sendMail.
export function smtpConfig(env: Record<string, string | undefined> = process.env) {
  if (!env.SMTP_HOST) return null;
  const port = Number(env.SMTP_PORT || 587);
  return {
    host: env.SMTP_HOST,
    port,
    // 465 : connexion chiffrée dès le départ. 587 : la connexion passe en chiffré juste après (STARTTLS)
    secure: port === 465,
    auth: { user: env.SMTP_USER ?? "", pass: env.SMTP_PASS ?? "" },
  };
}

const config = smtpConfig();
const transport = config ? nodemailer.createTransport(config) : null;

// Sans serveur, l'e-mail n'est pas envoyé : sa version texte est affichée dans les logs
// de l'application (terminal de npm run dev), ce qui permet de cliquer sur le lien.
export async function sendMail({ to, subject, text, html }: Mail) {
  if (!transport) {
    console.log(`[e-mail non envoyé : SMTP_HOST absent] À : ${to} | Sujet : ${subject}\n${text}`);
    return;
  }
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? "Musicodex <no-reply@localhost>",
    to,
    subject,
    text,
    html,
  });
}
