"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { deleteAccount } from "@/lib/account";
import { MINUTE, isRateLimited } from "@/lib/rate-limit";
import { findUserById } from "@/lib/users";

export type DeleteState = { error?: string };

// Suppression définitive du compte (RGPD : droit à l'effacement).
// Le joueur retape son pseudo, et son mot de passe s'il en a un : une session restée ouverte sur un
// appareil partagé ne suffit pas pour effacer un compte.
export async function deleteAccountAction(_previous: DeleteState, formData: FormData): Promise<DeleteState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const user = await findUserById(session.user.id);
  if (!user) redirect("/connexion");

  if (await isRateLimited(`delete:${user.id}`, 5, 15 * MINUTE)) {
    return { error: "Trop d'essais : réessaie dans un quart d'heure." };
  }
  if (String(formData.get("pseudo") ?? "").trim().toLowerCase() !== user.pseudo.toLowerCase()) {
    return { error: "Le pseudo ne correspond pas." };
  }
  if (user.password_hash && !(await bcrypt.compare(String(formData.get("password") ?? ""), user.password_hash))) {
    return { error: "Mot de passe incorrect." };
  }

  await deleteAccount(user.id);
  await signOut({ redirectTo: "/?compte=supprime" });
  return {};
}
