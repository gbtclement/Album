"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { claimAllPass, claimPassTier, PassError } from "@/lib/pass";
import { passRewardLabel, type PassTrack } from "@/lib/pass-rules";

function backTo(message: string): never {
  redirect(`/passe?message=${encodeURIComponent(message)}`);
}

export async function claimPassTierAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  try {
    const reward = await claimPassTier(session.user.id, Number(formData.get("tier")), String(formData.get("track")) as PassTrack);
    backTo(`Récompense récupérée : ${passRewardLabel(reward)}.`);
  } catch (error) {
    if (error instanceof PassError) backTo(error.message);
    throw error;
  }
}

export async function claimAllPassAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const count = await claimAllPass(session.user.id);
  backTo(count > 0 ? `${count} récompense${count > 1 ? "s" : ""} récupérée${count > 1 ? "s" : ""} : va ouvrir tes packs !` : "Rien à réclamer pour l'instant.");
}
