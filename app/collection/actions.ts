"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ArtistSetError, claimArtistSet } from "@/lib/artist-sets";
import { craftAlbum, DustError, pressDuplicates } from "@/lib/dust";
import type { RarityTier } from "@/lib/rarity";
import { toggleWish, WishlistError } from "@/lib/wishlist";

function backTo(message: string, path = "/collection?vue=artistes"): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}message=${encodeURIComponent(message)}`);
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session.user.id;
}

export async function claimSetAction(formData: FormData) {
  const userId = await requireUserId();
  const artist = String(formData.get("artist") ?? "");
  try {
    const result = await claimArtistSet(userId, artist);
    const pack = result.pack ? " et un pack" : "";
    backTo(`Collection ${artist} terminée : +${result.coins.toLocaleString("fr-FR")} pièces${pack} !`);
  } catch (error) {
    if (error instanceof ArtistSetError) backTo(error.message);
    throw error;
  }
}

function pressMessage({ cards, dust }: { cards: number; dust: number }) {
  return `${cards} doublon${cards > 1 ? "s" : ""} pressé${cards > 1 ? "s" : ""} : +${dust.toLocaleString("fr-FR")} poussière${dust > 1 ? "s" : ""} de vinyle.`;
}

// Presse les doublons des raretés cochées (un exemplaire de chaque album est toujours gardé)
export async function pressDuplicatesAction(formData: FormData) {
  const userId = await requireUserId();
  const tiers = formData.getAll("tier").map(String) as RarityTier[];
  try {
    backTo(pressMessage(await pressDuplicates(userId, { tiers })), "/collection");
  } catch (error) {
    if (error instanceof DustError) backTo(error.message, "/collection");
    throw error;
  }
}

// Presse les doublons d'un seul album (fiche de la collection)
export async function pressAlbumAction(formData: FormData) {
  const userId = await requireUserId();
  try {
    backTo(pressMessage(await pressDuplicates(userId, { slug: String(formData.get("slug") ?? "") })), "/collection");
  } catch (error) {
    if (error instanceof DustError) backTo(error.message, "/collection");
    throw error;
  }
}

// Ajoute ou retire un album de la liste de souhaits ; retour sur la page d'où vient le clic (fiche ou onglet Souhaits)
export async function toggleWishAction(formData: FormData) {
  const userId = await requireUserId();
  const slug = String(formData.get("slug") ?? "");
  const back = formData.get("from") === "souhaits" ? "/collection?vue=souhaits" : `/album/${encodeURIComponent(slug)}`;
  try {
    const added = await toggleWish(userId, slug);
    backTo(added ? "Ajouté à ta liste de souhaits." : "Retiré de ta liste de souhaits.", back);
  } catch (error) {
    if (error instanceof WishlistError) backTo(error.message, back);
    throw error;
  }
}

// Fabrique un album absent de la collection, depuis sa fiche
export async function craftAlbumAction(formData: FormData) {
  const userId = await requireUserId();
  const slug = String(formData.get("slug") ?? "");
  try {
    const { title } = await craftAlbum(userId, slug);
    backTo(`${title} fabriqué : il est dans ta collection !`, `/album/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof DustError) backTo(error.message, `/album/${encodeURIComponent(slug)}`);
    throw error;
  }
}
