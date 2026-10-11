// Règles du passe de combat (lot P2). Ce fichier ne dépend pas de la base : il peut être utilisé côté client.
import type { RarityTier } from "@/lib/rarity";

// XP de chaque carte obtenue (packs de toute sorte, pioche du jour trouvée)
export const PASS_XP: Record<RarityTier, number> = {
  commun: 10,
  peu_commun: 20,
  rare: 50,
  epique: 120,
  legendaire: 300,
};

export const XP_PER_TIER = 1000;
export const PASS_TIERS = 30;

export type PassTrack = "free" | "premium";
export const PASS_TRACKS: PassTrack[] = ["free", "premium"];
// Récompenses : uniquement des packs, jamais de pièces (pour ne pas faire gonfler les prix du marché)
export type PassReward = { classic?: number; solo?: number; epic?: number; legendary?: number };

function rewardFor(tier: number): { free: PassReward; premium: PassReward } {
  if (tier === 30) return { free: { epic: 1 }, premium: { legendary: 1 } };
  if (tier === 15) return { free: { epic: 1 }, premium: { classic: 2 } };
  if (tier === 10 || tier === 20) return { free: { classic: 1 }, premium: { epic: 1 } };
  if (tier % 5 === 0) return { free: { classic: 1 }, premium: { classic: 2 } };
  return { free: { solo: 1 }, premium: { classic: 1 } };
}

export const PASS_REWARDS = Array.from({ length: PASS_TIERS }, (_, i) => ({ tier: i + 1, ...rewardFor(i + 1) }));

// Palier atteint (0 à 30)
export function passLevel(xp: number) {
  return Math.min(PASS_TIERS, Math.floor(xp / XP_PER_TIER));
}

export function xpForCards(tiers: RarityTier[]) {
  return tiers.reduce((sum, tier) => sum + PASS_XP[tier], 0);
}

// Fin d'une saison (identifiée par son premier jour, YYYY-MM-DD) : le 1er du mois suivant, minuit UTC
export function seasonEnd(season: string) {
  const [year, month] = season.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1));
}

// « 1 pack Épique », « 2 packs »
export function passRewardLabel({ classic = 0, solo = 0, epic = 0, legendary = 0 }: PassReward) {
  const parts: string[] = [];
  if (legendary > 0) parts.push(`${legendary} pack${legendary > 1 ? "s" : ""} Légendaire${legendary > 1 ? "s" : ""}`);
  if (epic > 0) parts.push(`${epic} pack${epic > 1 ? "s" : ""} Épique${epic > 1 ? "s" : ""}`);
  if (classic > 0) parts.push(`${classic} pack${classic > 1 ? "s" : ""}`);
  if (solo > 0) parts.push(`${solo} pack${solo > 1 ? "s" : ""} Solo`);
  return parts.join(" + ");
}

// Total des récompenses d'une ligne sur les 30 paliers (affiché sur la page premium)
export function passTrackTotal(track: PassTrack): Required<PassReward> {
  return PASS_REWARDS.reduce(
    (sum, row) => ({
      classic: sum.classic + (row[track].classic ?? 0),
      solo: sum.solo + (row[track].solo ?? 0),
      epic: sum.epic + (row[track].epic ?? 0),
      legendary: sum.legendary + (row[track].legendary ?? 0),
    }),
    { classic: 0, solo: 0, epic: 0, legendary: 0 },
  );
}
