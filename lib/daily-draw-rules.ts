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

// Le morceau montré fait 30 % de la largeur et de la hauteur de la pochette (un onzième de l'image) :
// assez pour reconnaître une pochette connue, rarement assez pour lire le titre en entier
export const CROP_SIZE = 0.3;

// Une série de 7 bonnes réponses d'affilée rapporte un pack Épique (ajouté aux packs gagnés)
export const STREAK_BONUS_EVERY = 7;

// Nouvelle pioche chaque jour à minuit, heure de Paris
export const DRAW_TIME_ZONE = "Europe/Paris";

// Comparaison des titres sans tenir compte des majuscules, des accents ni des espaces en trop
export function normalizeTitle(title: string) {
  return title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
