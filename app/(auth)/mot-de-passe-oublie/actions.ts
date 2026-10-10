"use server";

import { headers } from "next/headers";
import { requestPasswordReset } from "@/lib/password-reset";
import { clientIp, HOUR, isRateLimited } from "@/lib/rate-limit";

export type ForgotState = { error?: string; sentTo?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function forgotPasswordAction(_previous: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Adresse e-mail invalide." };

  // Évite de se servir du site pour envoyer des e-mails en boucle (à une personne ou à beaucoup)
  const [ipLimited, emailLimited] = await Promise.all([
    isRateLimited(`reset:ip:${clientIp(await headers())}`, 10, HOUR),
    isRateLimited(`reset:email:${email}`, 3, HOUR),
  ]);
  if (ipLimited || emailLimited) return { error: "Trop de demandes : réessaie dans une heure." };

  try {
    await requestPasswordReset(email);
  } catch (error) {
    console.error("Envoi de l'e-mail de réinitialisation impossible", error);
    return { error: "L'e-mail n'a pas pu être envoyé. Réessaie dans quelques minutes." };
  }
  // Même réponse qu'il existe un compte ou non : la page ne révèle pas qui est inscrit
  return { sentTo: email };
}
