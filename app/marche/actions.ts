"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buyListing, cancelListing, createListing, MarketError } from "@/lib/market";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session.user.id;
}

function backTo(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

export async function createListingAction(formData: FormData) {
  const userId = await requireUserId();
  const albumSlug = String(formData.get("albumSlug") ?? "");
  const mode = String(formData.get("mode") ?? "coins");
  try {
    if (mode === "swap") {
      await createListing(userId, albumSlug, { kind: "swap", wantedSlug: String(formData.get("wantedSlug") ?? "") });
    } else {
      await createListing(userId, albumSlug, { kind: "coins", price: Math.floor(Number(formData.get("price"))) });
    }
    backTo("/marche", "Annonce publiée.");
  } catch (error) {
    if (error instanceof MarketError) backTo("/marche/vendre", error.message);
    throw error;
  }
}

export async function buyListingAction(formData: FormData) {
  const userId = await requireUserId();
  const offeredSlug = String(formData.get("offeredSlug") ?? "") || null;
  try {
    await buyListing(userId, String(formData.get("listingId")), offeredSlug);
    backTo("/marche", "Achat réalisé : l'album est dans ta collection.");
  } catch (error) {
    if (error instanceof MarketError) backTo("/marche", error.message);
    throw error;
  }
}

export async function cancelListingAction(formData: FormData) {
  const userId = await requireUserId();
  try {
    await cancelListing(userId, String(formData.get("listingId")));
    backTo("/marche", "Annonce retirée.");
  } catch (error) {
    if (error instanceof MarketError) backTo("/marche", error.message);
    throw error;
  }
}
