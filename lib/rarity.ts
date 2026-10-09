// Paliers de rareté des cartes. Les clés sont stockées en base, les libellés affichés à l'écran.
export const RARITY_TIERS = ["commun", "peu_commun", "rare", "epique", "legendaire"] as const;
export type RarityTier = (typeof RARITY_TIERS)[number];

export const RARITY_LABELS: Record<RarityTier, string> = {
  commun: "Commun",
  peu_commun: "Peu commun",
  rare: "Rare",
  epique: "Épique",
  legendaire: "Légendaire",
};

// Points du classement : chaque album possédé vaut ses points, une seule fois
export const RARITY_POINTS: Record<RarityTier, number> = {
  commun: 1,
  peu_commun: 2,
  rare: 5,
  epique: 10,
  legendaire: 25,
};

// Part du catalogue, en partant des albums les plus écoutés, pour chaque palier
const CUMULATIVE_SHARES: Array<[RarityTier, number]> = [
  ["legendaire", 0.005],
  ["epique", 0.02],
  ["rare", 0.1],
  ["peu_commun", 0.35],
];

// Attribue un palier à un album selon son rang (0 = le plus écouté).
// Chaque palier supérieur garde au moins un album, même sur un petit catalogue.
export function tierForRank(rank: number, total: number): RarityTier {
  let boundary = 0;
  for (const [tier, share] of CUMULATIVE_SHARES) {
    boundary += Math.max(1, Math.round(total * share));
    if (rank < boundary) return tier;
  }
  return "commun";
}
