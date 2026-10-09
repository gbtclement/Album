"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type FormState = { error?: string };

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/profil" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou mot de passe incorrect." };
    }
    // Les redirections de Next.js passent par ici : on les laisse remonter
    throw error;
  }
  return {};
}

export async function googleLoginAction() {
  await signIn("google", { redirectTo: "/profil" });
}
