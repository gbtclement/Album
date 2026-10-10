"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FriendError, removeFriend, respondFriendRequest, sendFriendRequest } from "@/lib/friends";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session.user.id;
}

function backTo(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

export async function sendFriendRequestAction(formData: FormData) {
  const userId = await requireUserId();
  try {
    const result = await sendFriendRequest(userId, String(formData.get("pseudo") ?? ""));
    backTo(
      "/amis",
      result.accepted ? `Vous êtes maintenant amis avec ${result.pseudo}.` : `Demande envoyée à ${result.pseudo}.`,
    );
  } catch (error) {
    if (error instanceof FriendError) backTo("/amis", error.message);
    throw error;
  }
}

export async function respondFriendRequestAction(formData: FormData) {
  const userId = await requireUserId();
  const accept = formData.get("decision") === "accept";
  try {
    await respondFriendRequest(userId, String(formData.get("requesterId")), accept);
    backTo("/amis", accept ? "Demande acceptée." : "Demande refusée.");
  } catch (error) {
    if (error instanceof FriendError) backTo("/amis", error.message);
    throw error;
  }
}

export async function removeFriendAction(formData: FormData) {
  const userId = await requireUserId();
  await removeFriend(userId, String(formData.get("friendId")));
  backTo("/amis", "Ami retiré de ta liste.");
}
