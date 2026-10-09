// Règles des packs. Ce fichier ne dépend pas de la base : il peut être utilisé côté client.
import type { RarityTier } from "@/lib/rarity";

export const PACK_SIZE = 5;
export const MAX_STOCK = 10;
export const PACK_INTERVAL_MS = 5 * 60 * 1000;

// Probabilité de chaque palier pour une carte tirée (la somme fait 100 %)
export const PACK_RATES: Record<RarityTier, number> = {
  commun: 0.65,
  peu_commun: 0.25,
  rare: 0.08,
  epique: 0.015,
  legendaire: 0.005,
};
