"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, TOO_MANY_ATTEMPTS } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";

// values : ce que le joueur avait saisi, remis dans le formulaire après une erreur (jamais le mot de passe)
export type FormState = { error?: string; values?: { email?: string } };

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const values = { email };
  const redirectTo = safeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === TOO_MANY_ATTEMPTS) {
      return { error: "Trop de tentatives de connexion. Réessaie dans 15 minutes.", values };
    }
    if (error instanceof AuthError) {
      return { error: "E-mail ou mot de passe incorrect.", values };
    }
    // Les redirections de Next.js passent par ici : on les laisse remonter
    throw error;
  }
  return {};
}
