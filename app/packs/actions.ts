"use server";

import { auth } from "@/auth";
import { openPack, PackError, type PackCard } from "@/lib/packs";

export type PackActionState = {
  error?: string;
  cards?: PackCard[];
  stock?: number;
  nextPackAt?: string | null;
};

export async function openPackAction(): Promise<PackActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Connecte-toi pour ouvrir un pack." };
  }

  try {
    const { cards, state } = await openPack(session.user.id);
    return {
      cards,
      stock: state.stock,
      nextPackAt: state.nextPackAt ? state.nextPackAt.toISOString() : null,
    };
  } catch (error) {
    if (error instanceof PackError) return { error: error.message };
    throw error;
  }
}
