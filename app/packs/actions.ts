"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { openPacks, PackError, type PackCard } from "@/lib/packs";

export type PackActionResult = {
  error?: string;
  cards?: PackCard[];
  opened?: number;
  stock?: number;
};

// Ouvre 1 pack, ou tous ceux disponibles (count = stock)
export async function openPacksAction(count: number): Promise<PackActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Connecte-toi pour ouvrir un pack." };

  try {
    const { cards, state, opened } = await openPacks(session.user.id, count);
    return { cards, opened, stock: state.stock };
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
