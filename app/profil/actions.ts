"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { premiumCancelledEmail } from "@/lib/email-templates";
import { sendVerificationEmail } from "@/lib/email-verification";
import { sendMail } from "@/lib/mailer";
import { cancelPremium } from "@/lib/premium";
import { HOUR, isRateLimited } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/seo";
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

// Résiliation du premium : effet immédiat, après avoir coché la case de confirmation
export async function cancelPremiumAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (formData.get("confirm") !== "on") backToProfile("Coche la case pour confirmer la résiliation.");

  const cancelled = await cancelPremium(session.user.id);
  if (cancelled) {
    // Confirmation par e-mail : une trace de la résiliation. Un échec d'envoi ne l'annule pas.
    const user = await findUserById(session.user.id);
    if (user) {
      try {
        await sendMail({ to: user.email, ...premiumCancelledEmail({ pseudo: user.pseudo, link: absoluteUrl("/premium") }) });
      } catch (error) {
        console.error("Envoi de l'e-mail de résiliation impossible", error);
      }
    }
  }
  backToProfile(cancelled ? "Premium résilié : ton compte est redevenu gratuit." : "Ton compte n'est pas premium.");
}
