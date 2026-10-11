"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ArtistSetError, claimArtistSet } from "@/lib/artist-sets";

function backTo(message: string): never {
  redirect(`/collection?vue=artistes&message=${encodeURIComponent(message)}`);
}

export async function claimSetAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const artist = String(formData.get("artist") ?? "");
  try {
    const result = await claimArtistSet(session.user.id, artist);
    const pack = result.packGiven ? " et un pack" : "";
    backTo(`Collection ${artist} terminée : +${result.coins.toLocaleString("fr-FR")} pièces${pack} !`);
  } catch (error) {
    if (error instanceof ArtistSetError) backTo(error.message);
    throw error;
  }
}
