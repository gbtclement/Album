"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DrawError, startNewDraw, submitGuess } from "@/lib/daily-draw";

function backTo(message: string): never {
  redirect(`/pioche?message=${encodeURIComponent(message)}`);
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session.user.id;
}

export async function guessAction(formData: FormData) {
  const userId = await requireUserId();
  const albumId = String(formData.get("albumId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(albumId)) backTo("Choisis un album dans la liste proposée.");

  try {
    const result = await submitGuess(userId, albumId);
    if (!result.finished) {
      backTo(`Raté ! Encore ${result.attemptsLeft} essai${result.attemptsLeft > 1 ? "s" : ""} : l'image s'élargit.`);
    }
    if (!result.solved) backTo("Raté, plus d'essai pour cette pioche.");
    const bonus = result.bonus === "epic" ? ` Série de ${result.streak} : un pack Épique offert !` : "";
    backTo(`Bravo, l'album rejoint ta collection !${bonus}`);
  } catch (error) {
    if (error instanceof DrawError) backTo(error.message);
    throw error;
  }
}

// Développement (DRAW_REPLAY=1) : nouvelle pioche sans attendre minuit
export async function newDrawAction() {
  const userId = await requireUserId();
  try {
    await startNewDraw(userId);
  } catch (error) {
    if (error instanceof DrawError) backTo(error.message);
    throw error;
  }
  redirect("/pioche");
}
