import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string };

// Sans SMTP_URL (en développement), l'e-mail n'est pas envoyé : il est affiché dans les logs
// de l'application (docker compose logs app), ce qui permet de cliquer sur le lien.
const transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;

export async function sendMail({ to, subject, text }: Mail) {
  if (!transport) {
    console.log(`[e-mail non envoyé : SMTP_URL absent] À : ${to} | Sujet : ${subject}\n${text}`);
    return;
  }
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? "Album <no-reply@localhost>",
    to,
    subject,
    text,
  });
}
