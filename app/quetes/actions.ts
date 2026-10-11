"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { rewardLabel } from "@/lib/pack-rules";
import { claimQuest, QuestError } from "@/lib/quests";

function backTo(message: string): never {
  redirect(`/quetes?message=${encodeURIComponent(message)}`);
}

export async function claimQuestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  try {
    const reward = await claimQuest(session.user.id, String(formData.get("questKey")));
    backTo(`Récompense récupérée : ${rewardLabel(reward)}.`);
  } catch (error) {
    if (error instanceof QuestError) backTo(error.message);
    throw error;
  }
}
