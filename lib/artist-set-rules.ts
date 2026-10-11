// Règles des collections d'artiste. Ce fichier ne dépend pas de la base : il peut être utilisé côté client.
import { RARITY_POINTS, type RarityTier } from "@/lib/rarity";

// Un artiste devient un set à compléter à partir de 3 albums dans le catalogue
export const SET_MIN_ALBUMS = 3;
// Récompense : 20 pièces par point de rareté des albums du set (commun 20, légendaire 500), 100 au minimum
export const COINS_PER_POINT = 20;
export const MIN_SET_COINS = 100;
// Les grands sets (8 albums et plus) offrent aussi un pack (ajouté aux packs gagnés)
export const PACK_SET_SIZE = 8;

export type SetReward = { coins: number; pack: boolean };

export function setReward(tiers: RarityTier[]): SetReward {
  const points = tiers.reduce((sum, tier) => sum + RARITY_POINTS[tier], 0);
  return { coins: Math.max(MIN_SET_COINS, points * COINS_PER_POINT), pack: tiers.length >= PACK_SET_SIZE };
}
