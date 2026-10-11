// Règles des packs. Ce fichier ne dépend pas de la base : il peut être utilisé côté client.
import type { RarityTier } from "@/lib/rarity";

export const PACK_SIZE = 5;
export const MAX_STOCK = 10;
export const PACK_INTERVAL_MS = 5 * 60 * 1000;

// Packs gagnés (quêtes, séries de la pioche, grands sets) : gardés à part du stock, sans maximum.
// Un pack classique contient PACK_SIZE albums, un pack Solo un seul.
export type PackKind = "classic" | "solo";
export const SOLO_PACK_SIZE = 1;

export type Reward = { coins: number; packs: number; solo: number };

// « 1 pack Solo + 100 pièces »
export function rewardLabel({ coins, packs, solo }: Reward) {
  const parts: string[] = [];
  if (packs > 0) parts.push(`${packs} pack${packs > 1 ? "s" : ""}`);
  if (solo > 0) parts.push(`${solo} pack${solo > 1 ? "s" : ""} Solo`);
  if (coins > 0) parts.push(`${coins.toLocaleString("fr-FR")} pièces`);
  return parts.join(" + ");
}

// Probabilité de chaque palier pour une carte tirée (la somme fait 100 %)
export const PACK_RATES: Record<RarityTier, number> = {
  commun: 0.65,
  peu_commun: 0.25,
  rare: 0.08,
  epique: 0.015,
  legendaire: 0.005,
};
