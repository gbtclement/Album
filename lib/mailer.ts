import nodemailer from "nodemailer";
import type { EmailContent } from "@/lib/email-templates";

type Mail = EmailContent & { to: string };

// Sans SMTP_URL (en développement), l'e-mail n'est pas envoyé : sa version texte est affichée dans les logs
// de l'application (terminal de npm run dev), ce qui permet de cliquer sur le lien.
const transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;

export async function sendMail({ to, subject, text, html }: Mail) {
  if (!transport) {
    console.log(`[e-mail non envoyé : SMTP_URL absent] À : ${to} | Sujet : ${subject}\n${text}`);
    return;
  }
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? "Album <no-reply@localhost>",
    to,
    subject,
    text,
    html,
  });
}
