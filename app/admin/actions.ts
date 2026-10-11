"use server";

import { redirect } from "next/navigation";
import { AdminError, deleteUserAsAdmin, forceLogout, grantPremium, updateUserProfile } from "@/lib/admin";
import { requireAdmin } from "./guard";

function backTo(path: string, message: string): never {
  redirect(`${path}?${new URLSearchParams({ message })}`);
}

const userPage = (id: string) => `/admin/joueurs/${encodeURIComponent(id)}`;

// Exécute une action admin ; une AdminError (saisie refusée) revient comme message sur la fiche du joueur
async function run(id: string, work: () => Promise<string>): Promise<never> {
  let message: string;
  try {
    message = await work();
  } catch (error) {
    if (error instanceof AdminError) backTo(userPage(id), error.message);
    throw error;
  }
  backTo(userPage(id), message);
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await run(id, async () => {
    await updateUserProfile(admin, id, {
      pseudo: String(formData.get("pseudo") ?? ""),
      email: String(formData.get("email") ?? ""),
      emailVerified: formData.get("verified") === "on",
      coins: Number(formData.get("coins")),
    });
    return "Modifications enregistrées.";
  });
}

export async function grantPremiumAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await run(id, async () => {
    const until = await grantPremium(admin, id, Number(formData.get("days")));
    return until ? `Premium offert jusqu'au ${until.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.` : "Premium retiré.";
  });
}

export async function forceLogoutAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await run(id, async () => {
    await forceLogout(admin, id);
    return "Le joueur sera déconnecté de tous ses appareils d'ici une minute.";
  });
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    await deleteUserAsAdmin(admin, id, String(formData.get("confirm") ?? ""));
  } catch (error) {
    if (error instanceof AdminError) backTo(userPage(id), error.message);
    throw error;
  }
  backTo("/admin", "Compte supprimé.");
}
