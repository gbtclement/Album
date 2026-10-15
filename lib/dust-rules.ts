// Règles de la poussière de vinyle. Ce fichier ne dépend pas de la base : il peut être utilisé côté client.
import type { RarityTier } from "@/lib/rarity";

// Poussière gagnée en pressant un doublon (un exemplaire en trop), selon sa rareté
export const DUST_PER_DUPLICATE: Record<RarityTier, number> = {
  commun: 5,
  peu_commun: 10,
  rare: 25,
  epique: 60,
  legendaire: 150,
};

// Fabriquer un album coûte 4 doublons de sa rareté : choisir sa carte se paie
export const CRAFT_MULTIPLIER = 4;

export function craftCost(tier: RarityTier) {
  return DUST_PER_DUPLICATE[tier] * CRAFT_MULTIPLIER;
}

// Exemplaires qu'on peut presser : on garde toujours un exemplaire, et ceux engagés dans une annonce du marché
// ou une proposition d'échange en attente
export function pressableCopies(count: number, reserved: number) {
  return Math.max(0, count - Math.max(1, reserved));
}
