"use client";

import { useState, type CSSProperties } from "react";
import { CRAFT_COST, DUST_PER_DUPLICATE } from "@/lib/dust-rules";
import { RARITY_LABELS, RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { pressDuplicatesAction } from "./actions";

type Summary = Record<RarityTier, { cards: number; dust: number }>;

// Par défaut, les raretés courantes : les doublons épiques et légendaires valent souvent plus au marché
const DEFAULT_TIERS: RarityTier[] = ["commun", "peu_commun", "rare"];

// Pressoir de la collection : solde de poussière, doublons pressables par rareté, pressage en un geste (confirmé)
export function PressPanel({ dust, summary }: { dust: number; summary: Summary }) {
  const [tiers, setTiers] = useState<RarityTier[]>(DEFAULT_TIERS);
  const [confirming, setConfirming] = useState(false);
  const chosen = tiers.filter((tier) => summary[tier].cards > 0);
  const cards = chosen.reduce((sum, tier) => sum + summary[tier].cards, 0);
  const gain = chosen.reduce((sum, tier) => sum + summary[tier].dust, 0);
  const pressable = RARITY_TIERS.some((tier) => summary[tier].cards > 0);

  function toggle(tier: RarityTier) {
    setConfirming(false);
    setTiers((current) => (current.includes(tier) ? current.filter((item) => item !== tier) : [...current, tier]));
  }

  return (
    <details className="quest press">
      <summary>
        <span className="dust-i" aria-hidden="true" />
        <div className="l">
          <strong>{dust.toLocaleString("fr-FR")} poussière{dust > 1 ? "s" : ""} de vinyle</strong>
          <small>{pressable ? "Presse tes doublons pour fabriquer les albums qui te manquent" : "Aucun doublon à presser pour l'instant"}</small>
        </div>
        <span className="btn">Presser</span>
      </summary>
      <div className="press-body">
        <p className="set-note">
          Un exemplaire de chaque album est toujours gardé, ainsi que ceux en vente ou proposés en échange. Fabriquer un album
          depuis sa fiche coûte cher : {CRAFT_COST.commun.toLocaleString("fr-FR")} poussières pour un commun,{" "}
          {CRAFT_COST.legendaire.toLocaleString("fr-FR")} pour un légendaire.
        </p>
        <div className="chips wrap">
          {[...RARITY_TIERS].reverse().map((tier) => (
            <button
              key={tier}
              type="button"
              className="chip"
              style={{ "--c": `var(--r-${tier})` } as CSSProperties}
              aria-pressed={tiers.includes(tier)}
              disabled={summary[tier].cards === 0}
              onClick={() => toggle(tier)}
            >
              <i />
              {RARITY_LABELS[tier]} · {summary[tier].cards} (+{DUST_PER_DUPLICATE[tier]})
            </button>
          ))}
        </div>
        <form action={pressDuplicatesAction}>
          {chosen.map((tier) => <input key={tier} type="hidden" name="tier" value={tier} />)}
          {confirming ? (
            <button type="submit" className="btn gold block">
              Confirmer : presser {cards} doublon{cards > 1 ? "s" : ""} (+{gain.toLocaleString("fr-FR")})
            </button>
          ) : (
            <button type="button" className="btn gold block" disabled={cards === 0} onClick={() => setConfirming(true)}>
              {cards > 0 ? `Presser ${cards} doublon${cards > 1 ? "s" : ""} → +${gain.toLocaleString("fr-FR")} poussière${gain > 1 ? "s" : ""}` : "Rien à presser"}
            </button>
          )}
        </form>
      </div>
    </details>
  );
}
