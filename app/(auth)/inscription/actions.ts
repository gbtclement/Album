"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";
import { createUser, findUserByEmail, isPseudoTaken, isUniqueViolation, isValidPseudo } from "@/lib/users";

export type FormState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const pseudo = String(formData.get("pseudo") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isValidPseudo(pseudo)) {
    return { error: "Le pseudo doit faire entre 3 et 20 caractères (lettres, chiffres, _ ou -)." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Adresse e-mail invalide." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit faire au moins 8 caractères." };
  }

  if (await findUserByEmail(email)) {
    return { error: "Un compte existe déjà avec cette adresse e-mail." };
  }
  if (await isPseudoTaken(pseudo)) {
    return { error: "Ce pseudo est déjà pris." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await createUser({ email, pseudo, passwordHash });
  } catch (error) {
    // Deux inscriptions simultanées avec le même pseudo
    if (isUniqueViolation(error)) {
      return { error: "Ce pseudo ou cette adresse e-mail est déjà utilisé." };
    }
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Compte créé, mais la connexion a échoué. Essaie de te connecter." };
    }
    throw error;
  }
  return {};
}
