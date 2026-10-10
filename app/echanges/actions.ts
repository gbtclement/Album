"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { acceptTrade, closeTrade, createTrade, TradeError } from "@/lib/trades";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session.user.id;
}

// Retour vers une page avec un message (et d'autres paramètres éventuels, comme `avec` pour le formulaire d'échange)
function backTo(path: string, message: string, params: Record<string, string> = {}): never {
  const query = new URLSearchParams({ ...params, message });
  redirect(`${path}?${query}`);
}

function parseCoins(value: FormDataEntryValue | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.floor(number) : 0;
}

function parseSlug(value: FormDataEntryValue | null) {
  const slug = String(value ?? "").trim();
  return slug.length > 0 ? slug : null;
}

export async function createTradeAction(formData: FormData) {
  const userId = await requireUserId();
  const receiverId = String(formData.get("receiverId") ?? "");
  try {
    await createTrade(
      userId,
      receiverId,
      { albumSlug: parseSlug(formData.get("offerSlug")), coins: parseCoins(formData.get("offerCoins")) },
      { albumSlug: parseSlug(formData.get("requestSlug")), coins: parseCoins(formData.get("requestCoins")) },
    );
    backTo("/echanges", "Proposition envoyée.");
  } catch (error) {
    if (error instanceof TradeError) backTo("/echanges/nouveau", error.message, { avec: receiverId });
    throw error;
  }
}

export async function respondTradeAction(formData: FormData) {
  const userId = await requireUserId();
  const tradeId = String(formData.get("tradeId"));
  const decision = String(formData.get("decision"));
  try {
    if (decision === "accept") {
      await acceptTrade(userId, tradeId);
      backTo("/echanges", "Échange accepté : les cartes et les pièces ont été échangées.");
    }
    await closeTrade(userId, tradeId, decision === "cancel" ? "cancel" : "decline");
    backTo("/echanges", decision === "cancel" ? "Proposition annulée." : "Proposition refusée.");
  } catch (error) {
    if (error instanceof TradeError) backTo("/echanges", error.message);
    throw error;
  }
}
