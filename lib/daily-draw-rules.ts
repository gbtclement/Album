// Règles de la pioche du jour. Ce fichier ne dépend pas de la base : il peut être utilisé côté client.
import type { RarityTier } from "@/lib/rarity";

// Plus généreux que les packs (65 / 25 / 8 / 1,5 / 0,5 %) : il faut trouver l'album pour le gagner
export const DRAW_RATES: Record<RarityTier, number> = {
  commun: 0.4,
  peu_commun: 0.3,
  rare: 0.18,
  epique: 0.09,
  legendaire: 0.03,
};

// Trois essais. Le morceau montré fait d'abord 30 % de la largeur et de la hauteur de la pochette (un onzième de
// l'image) : assez pour reconnaître une pochette connue, rarement assez pour lire le titre. Chaque mauvaise réponse
// élargit le cadrage autour du même endroit (50 %, puis 75 %).
export const DRAW_ATTEMPTS = 3;
export const CROP_SIZES = [0.3, 0.5, 0.75] as const;
export const CROP_SIZE = CROP_SIZES[0];

// Cadrage après `wrong` mauvaises réponses : même centre que le premier morceau, sans sortir de la pochette
export function cropFor(x: number, y: number, wrong: number) {
  const size = CROP_SIZES[Math.min(wrong, CROP_SIZES.length - 1)];
  const recenter = (start: number) => Math.min(1 - size, Math.max(0, start + CROP_SIZE / 2 - size / 2));
  return { x: recenter(x), y: recenter(y), size };
}

// Une série de 7 bonnes réponses d'affilée rapporte un pack Épique (ajouté aux packs gagnés)
export const STREAK_BONUS_EVERY = 7;

// Nouvelle pioche chaque jour à minuit, heure de Paris
export const DRAW_TIME_ZONE = "Europe/Paris";

// Comparaison des titres sans tenir compte des majuscules, des accents ni des espaces en trop
export function normalizeTitle(title: string) {
  return title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
