"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { PackKind } from "@/lib/pack-rules";
import { openPack, PackError, type PackCard } from "@/lib/packs";

export type PackActionResult = {
  error?: string;
  cards?: PackCard[];
  stocks?: { stock: number; bonus: number; solo: number };
};

// Ouvre un seul pack (les packs s'ouvrent un par un) ; kind : pack classique ou pack Solo
export async function openPackAction(kind: PackKind = "classic"): Promise<PackActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Connecte-toi pour ouvrir un pack." };
  if (kind !== "classic" && kind !== "solo") return { error: "Type de pack inconnu." };

  try {
    const { cards, state } = await openPack(session.user.id, kind);
    return { cards, stocks: { stock: state.stock, bonus: state.bonus, solo: state.solo } };
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
