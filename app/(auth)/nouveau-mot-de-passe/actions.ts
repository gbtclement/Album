"use server";

import { redirect } from "next/navigation";
import { MIN_PASSWORD_LENGTH, resetPassword } from "@/lib/password-reset";
import { resetRateLimit } from "@/lib/rate-limit";

export type ResetState = { error?: string };

export async function resetPasswordAction(_previous: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` };
  }
  if (password !== confirmation) return { error: "Les deux mots de passe ne sont pas identiques." };

  const email = await resetPassword(token, password);
  if (!email) return { error: "Ce lien a déjà servi ou n'est plus valable. Demande-en un nouveau." };

  // Les essais ratés avant l'oubli ne doivent pas bloquer la connexion avec le nouveau mot de passe
  await resetRateLimit(`login:email:${email}`);
  redirect("/connexion?mot-de-passe=change");
}
