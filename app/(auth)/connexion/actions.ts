"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, TOO_MANY_ATTEMPTS } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";

export type FormState = { error?: string };

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === TOO_MANY_ATTEMPTS) {
      return { error: "Trop de tentatives de connexion. Réessaie dans 15 minutes." };
    }
    if (error instanceof AuthError) {
      return { error: "E-mail ou mot de passe incorrect." };
    }
    // Les redirections de Next.js passent par ici : on les laisse remonter
    throw error;
  }
  return {};
}

export async function googleLoginAction(formData: FormData) {
  await signIn("google", { redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
}
