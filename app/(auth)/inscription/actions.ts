"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";
import { sendVerificationEmail } from "@/lib/email-verification";
import { clientIp, HOUR, isRateLimited } from "@/lib/rate-limit";
import { createUser, findUserByEmail, isPseudoTaken, isUniqueViolation, isValidPseudo } from "@/lib/users";

// values : ce que le joueur avait saisi, remis dans le formulaire après une erreur (jamais le mot de passe)
export type FormState = { error?: string; values?: { pseudo?: string; email?: string } };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const pseudo = String(formData.get("pseudo") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { pseudo, email };

  if (!isValidPseudo(pseudo)) {
    return { error: "Le pseudo doit faire entre 3 et 20 caractères (lettres, chiffres, _ ou -).", values };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Adresse e-mail invalide.", values };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit faire au moins 8 caractères.", values };
  }
  if (password !== String(formData.get("confirmation") ?? "")) {
    return { error: "Les deux mots de passe ne sont pas identiques.", values };
  }
  // Case obligatoire aussi côté serveur (un formulaire peut être envoyé sans passer par le navigateur)
  if (formData.get("terms") !== "on") {
    return { error: "Coche la case pour accepter les conditions d'utilisation.", values };
  }

  // Limite les créations de comptes en masse depuis une même adresse IP
  if (await isRateLimited(`signup:ip:${clientIp(await headers())}`, 10, HOUR)) {
    return { error: "Trop de comptes créés depuis cette connexion. Réessaie dans une heure.", values };
  }

  if (await findUserByEmail(email)) {
    return { error: "Un compte existe déjà avec cette adresse e-mail.", values };
  }
  if (await isPseudoTaken(pseudo)) {
    return { error: "Ce pseudo est déjà pris.", values };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let userId: string;
  try {
    userId = (await createUser({ email, pseudo, passwordHash })).id;
  } catch (error) {
    // Deux inscriptions simultanées avec le même pseudo
    if (isUniqueViolation(error)) {
      return { error: "Ce pseudo ou cette adresse e-mail est déjà utilisé.", values };
    }
    throw error;
  }

  // Le compte est utilisable tout de suite ; un e-mail permet de prouver que l'adresse est bien la sienne.
  // Un échec d'envoi ne bloque pas l'inscription : le joueur pourra redemander le lien depuis son profil.
  try {
    await sendVerificationEmail(userId, email, pseudo);
  } catch (error) {
    console.error("Envoi de l'e-mail de vérification impossible", error);
  }

  try {
    await signIn("credentials", { email, password, redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Compte créé, mais la connexion a échoué. Essaie de te connecter.", values };
    }
    throw error;
  }
  return {};
}
