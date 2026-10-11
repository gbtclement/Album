"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DrawError, submitGuess } from "@/lib/daily-draw";
import { STREAK_BONUS_COINS } from "@/lib/daily-draw-rules";

function backTo(message: string): never {
  redirect(`/pioche?message=${encodeURIComponent(message)}`);
}

export async function guessAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const albumId = String(formData.get("albumId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(albumId)) backTo("Choisis un album dans la liste proposée.");

  try {
    const result = await submitGuess(session.user.id, albumId);
    if (!result.solved) backTo("Raté ! Nouvelle pioche demain à minuit.");
    const bonus =
      result.bonus === "pack" ? ` Série de ${result.streak} : un pack offert !`
      : result.bonus === "coins" ? ` Série de ${result.streak} : +${STREAK_BONUS_COINS} pièces (stock de packs plein).`
      : "";
    backTo(`Bravo, l'album rejoint ta collection !${bonus}`);
  } catch (error) {
    if (error instanceof DrawError) backTo(error.message);
    throw error;
  }
}
