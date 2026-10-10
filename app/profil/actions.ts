"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sendVerificationEmail } from "@/lib/email-verification";
import { HOUR, isRateLimited } from "@/lib/rate-limit";
import { findUserById } from "@/lib/users";

function backToProfile(message: string): never {
  redirect(`/profil?${new URLSearchParams({ message })}`);
}

export async function resendVerificationAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const user = await findUserById(session.user.id);
  if (!user || user.email_verified_at) backToProfile("Ton adresse est déjà vérifiée.");

  // Évite de se servir du site pour envoyer des e-mails en boucle
  if (await isRateLimited(`verify-mail:${user.id}`, 3, HOUR)) {
    backToProfile("Trop de demandes : réessaie dans une heure.");
  }

  try {
    await sendVerificationEmail(user.id, user.email, user.pseudo);
  } catch (error) {
    console.error("Envoi de l'e-mail de vérification impossible", error);
    backToProfile("L'e-mail n'a pas pu être envoyé. Réessaie plus tard.");
  }
  backToProfile(`Un nouveau lien a été envoyé à ${user.email}.`);
}
