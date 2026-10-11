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

// Rareté d'un album selon ses écoutes Last.fm (toutes versions confondues, voir lib/lastfm.ts).
// Seuils FIXES : ajouter des albums au catalogue ne change pas la rareté des autres. Ils ont été calculés une fois
// pour donner, sur le catalogue d'octobre 2026, environ 0,5 % de légendaires, 2 % d'épiques, 10 % de rares et
// 35 % de peu communs (le reste en commun).
export const RARITY_THRESHOLDS: Record<Exclude<RarityTier, "commun">, number> = {
  legendaire: 133_000_000,
  epique: 56_000_000,
  rare: 14_000_000,
  peu_commun: 1_900_000,
};

export function tierForPlays(plays: number): RarityTier {
  if (plays >= RARITY_THRESHOLDS.legendaire) return "legendaire";
  if (plays >= RARITY_THRESHOLDS.epique) return "epique";
  if (plays >= RARITY_THRESHOLDS.rare) return "rare";
  if (plays >= RARITY_THRESHOLDS.peu_commun) return "peu_commun";
  return "commun";
}

// Écoutes comptées au plus par auditeur : au-delà, ce sont quelques fans qui font tourner l'album en boucle
// (ARIRANG de BTS : 1,3 milliard d'écoutes Last.fm pour 660 000 auditeurs, près de 2 000 chacun ; la médiane est de 16).
export const MAX_PLAYS_PER_LISTENER = 100;
// Un album a environ 54 fois plus d'écoutes sur Last.fm que sur ListenBrainz (médiane du catalogue) :
// sert d'estimation quand Last.fm n'a pas l'album, ou un chiffre manifestement faux (10 fois trop bas)
export const LISTENBRAINZ_TO_LASTFM = 54;

export type ListenStats = {
  lastfmPlaycount: number | null;
  lastfmListeners: number | null;
  listens: number | null;
  listeners: number | null;
};

// Écoutes retenues pour la rareté (équivalent Last.fm)
export function rarityScore(stats: ListenStats): number {
  const capped = (plays: number, listeners: number | null) => (listeners === null ? plays : Math.min(plays, listeners * MAX_PLAYS_PER_LISTENER));
  const estimate = stats.listens === null ? 0 : capped(stats.listens, stats.listeners) * LISTENBRAINZ_TO_LASTFM;
  if (stats.lastfmPlaycount === null || stats.lastfmPlaycount * 10 < estimate) return estimate;
  return capped(stats.lastfmPlaycount, stats.lastfmListeners);
}
