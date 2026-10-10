"use client";

import type { CSSProperties } from "react";
import { SearchIcon } from "@/components/icons";
import { RARITY_LABELS, RARITY_TIERS, type RarityTier } from "@/lib/rarity";

// Comparaison sans accents ni majuscules : « bjork » trouve « Björk »
export function normalizeSearch(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function matchesSearch(query: string, ...fields: string[]) {
  const q = normalizeSearch(query);
  return !q || normalizeSearch(fields.join(" ")).includes(q);
}

export function SearchBar({ value, onChange, placeholder, id }: { value: string; onChange: (value: string) => void; placeholder: string; id: string }) {
  return (
    <div className="searchbar">
      <SearchIcon />
      <input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} autoComplete="off" />
      {value && (
        <button type="button" className="clear" aria-label="Effacer la recherche" onClick={() => onChange("")}>×</button>
      )}
    </div>
  );
}

// Puces de filtre par rareté, de la plus rare à la plus commune
export function TierChips({ value, onChange }: { value: RarityTier | "all"; onChange: (value: RarityTier | "all") => void }) {
  return (
    <div className="chips">
      <button type="button" className="chip" aria-pressed={value === "all"} onClick={() => onChange("all")}>Toutes</button>
      {[...RARITY_TIERS].reverse().map((tier) => (
        <button key={tier} type="button" className="chip" style={{ "--c": `var(--r-${tier})` } as CSSProperties} aria-pressed={value === tier} onClick={() => onChange(tier)}>
          <i />
          {RARITY_LABELS[tier]}
        </button>
      ))}
    </div>
  );
}
