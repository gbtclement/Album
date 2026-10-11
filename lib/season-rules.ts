// Classement saisonnier (lot S1). Ce fichier ne dépend pas de la base : il peut être utilisé côté client.
// Une saison = un mois UTC, comme le passe de combat. Seules les cartes obtenues en ouvrant des packs
// rapportent des points (pas le marché, les échanges ni la pioche du jour).
import { RARITY_POINTS, type RarityTier } from "@/lib/rarity";

export function seasonPoints(tiers: RarityTier[]) {
  return tiers.reduce((sum, tier) => sum + RARITY_POINTS[tier], 0);
}

export type SeasonReward = { coins: number; classic: number; epic: number; legendary: number };

// Barème de fin de saison, par tranche de places (le top 20 seulement)
export const SEASON_REWARD_TABLE: Array<{ from: number; to: number; reward: SeasonReward }> = [
  { from: 1, to: 1, reward: { coins: 3000, classic: 0, epic: 2, legendary: 1 } },
  { from: 2, to: 2, reward: { coins: 2000, classic: 0, epic: 1, legendary: 1 } },
  { from: 3, to: 3, reward: { coins: 1500, classic: 0, epic: 0, legendary: 1 } },
  { from: 4, to: 10, reward: { coins: 750, classic: 0, epic: 1, legendary: 0 } },
  { from: 11, to: 20, reward: { coins: 300, classic: 2, epic: 0, legendary: 0 } },
];
export const SEASON_REWARDED_PLACES = 20;

export function seasonReward(rank: number): SeasonReward | null {
  return SEASON_REWARD_TABLE.find((row) => rank >= row.from && rank <= row.to)?.reward ?? null;
}

// « 3 000 pièces + 1 pack Légendaire + 2 packs Épiques »
export function seasonRewardLabel({ coins, classic, epic, legendary }: SeasonReward) {
  const parts: string[] = [];
  if (coins > 0) parts.push(`${coins.toLocaleString("fr-FR")} pièces`);
  if (legendary > 0) parts.push(`${legendary} pack${legendary > 1 ? "s" : ""} Légendaire${legendary > 1 ? "s" : ""}`);
  if (epic > 0) parts.push(`${epic} pack${epic > 1 ? "s" : ""} Épique${epic > 1 ? "s" : ""}`);
  if (classic > 0) parts.push(`${classic} pack${classic > 1 ? "s" : ""}`);
  return parts.join(" + ");
}

// « octobre » pour la saison 2026-10-01
export function seasonMonth(season: string) {
  const [year, month] = season.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(Date.UTC(year, month - 1, 1));
}

// « Saison d'octobre », « Saison de mars »
export function seasonName(season: string) {
  const month = seasonMonth(season);
  return `Saison ${/^[aeiou]/.test(month) ? "d'" : "de "}${month}`;
}
