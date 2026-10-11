// Règles des packs. Ce fichier ne dépend pas de la base : il peut être utilisé côté client.
import type { RarityTier } from "@/lib/rarity";

export const PACK_SIZE = 5;
export const MAX_STOCK = 10;
export const PACK_INTERVAL_MS = 5 * 60 * 1000;

// Packs gagnés (quêtes, séries de la pioche, grands sets, passe) : gardés à part du stock, sans maximum.
// Un pack classique contient PACK_SIZE albums, un pack Solo un seul.
export type PackKind = "classic" | "solo" | "epic" | "legendary";
export const PACK_KINDS: PackKind[] = ["classic", "solo", "epic", "legendary"];
export const SOLO_PACK_SIZE = 1;
// Packs Épique et Légendaire : 5 cartes dont une de ce palier garantie, les autres aux taux habituels
export const GUARANTEED_TIER: Partial<Record<PackKind, RarityTier>> = { epic: "epique", legendary: "legendaire" };
export const PACK_LABELS: Record<PackKind, string> = { classic: "Pack", solo: "Pack Solo", epic: "Pack Épique", legendary: "Pack Légendaire" };

export function packSize(kind: PackKind) {
  return kind === "solo" ? SOLO_PACK_SIZE : PACK_SIZE;
}

export type Reward = { coins: number; packs: number; solo: number; epic?: number; legendary?: number };

// « 1 pack Épique + 1 pack Solo + 100 pièces »
export function rewardLabel({ coins, packs, solo, epic = 0, legendary = 0 }: Reward) {
  const parts: string[] = [];
  if (legendary > 0) parts.push(`${legendary} pack${legendary > 1 ? "s" : ""} Légendaire${legendary > 1 ? "s" : ""}`);
  if (epic > 0) parts.push(`${epic} pack${epic > 1 ? "s" : ""} Épique${epic > 1 ? "s" : ""}`);
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
