"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PACK_KINDS, type PackKind } from "@/lib/pack-rules";
import { openPack, PackError, type PackCard, type PackState } from "@/lib/packs";

// Réserves de packs affichées sur la page Packs
export type Stocks = Omit<PackState, "nextPackAt">;

export type PackActionResult = {
  error?: string;
  cards?: PackCard[];
  stocks?: Stocks;
};

// Pas exportée : un fichier "use server" n'exporte que des fonctions async (actions)
function toStocks({ stock, max, bonus, solo, epic, legendary }: PackState): Stocks {
  return { stock, max, bonus, solo, epic, legendary };
}

// Ouvre un seul pack (les packs s'ouvrent un par un) ; kind : classique, Solo, Épique ou Légendaire
export async function openPackAction(kind: PackKind = "classic"): Promise<PackActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Connecte-toi pour ouvrir un pack." };
  if (!PACK_KINDS.includes(kind)) return { error: "Type de pack inconnu." };

  try {
    const { cards, state } = await openPack(session.user.id, kind);
    return { cards, stocks: toStocks(state) };
  } catch (error) {
    if (error instanceof PackError) return { error: error.message };
    throw error;
  }
}

// Réglage « Révéler automatiquement » : les cartes d'un pack se retournent seules
export async function setAutoRevealAction(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) return;
  await db.query("update users set auto_reveal = $2 where id = $1", [session.user.id, enabled]);
  revalidatePath("/profil");
  revalidatePath("/packs");
}
