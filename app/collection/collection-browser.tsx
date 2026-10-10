"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { matchesSearch, SearchBar, TierChips } from "@/components/game-controls";
import { smallCover } from "@/components/game-ui";
import type { CollectionCard } from "@/lib/collection";
import { RARITY_LABELS, RARITY_POINTS, RARITY_TIERS, type RarityTier } from "@/lib/rarity";

const PLATFORMS = [
  { key: "spotify", label: "Spotify" },
  { key: "deezer", label: "Deezer" },
  { key: "youtube", label: "YouTube" },
] as const;

const tierRank = (tier: RarityTier) => RARITY_TIERS.indexOf(tier);

// Grille de la collection : recherche, filtre de rareté, et fiche d'album qui glisse depuis le bas.
// Seules les cartes possédées sont listées (le serveur ne renvoie rien d'autre).
export function CollectionBrowser({ cards }: { cards: CollectionCard[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<RarityTier | "all">("all");
  const [selected, setSelected] = useState<CollectionCard | null>(null);

  const visible = useMemo(
    () =>
      cards
        .filter((card) => (tier === "all" || card.rarity_tier === tier) && matchesSearch(query, card.title, card.artist))
        .sort((a, b) => tierRank(b.rarity_tier) - tierRank(a.rarity_tier) || a.title.localeCompare(b.title, "fr")),
    [cards, query, tier],
  );

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <SearchBar id="q-collection" value={query} onChange={setQuery} placeholder="Rechercher un album ou un artiste" />
      <TierChips value={tier} onChange={setTier} />

      <div className="cards">
        {visible.length === 0 ? (
          <p className="empty">
            {query ? `Aucun album de ta collection ne correspond à « ${query} ».` : "Aucune carte de cette rareté pour l'instant. Ouvre des packs pour en trouver."}
          </p>
        ) : (
          visible.map((card) => (
            <button key={card.slug} type="button" className={`card tier-${card.rarity_tier}`} onClick={() => setSelected(card)}>
              <span className="cover">
                {/* eslint-disable-next-line @next/next/no-img-element -- pochettes servies par Cover Art Archive */}
                {card.cover_url && <img src={smallCover(card.cover_url)!} alt="" loading="lazy" />}
                {card.count > 1 && <b>x{card.count}</b>}
              </span>
              <span className="t">{card.title}</span>
              <span className="a">{card.artist}</span>
            </button>
          ))
        )}
      </div>

      {selected && <AlbumSheet card={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function AlbumSheet({ card, onClose }: { card: CollectionCard; onClose: () => void }) {
  return (
    <div className="sheet-wrap">
      <button type="button" className="sheet-back" aria-label="Fermer" onClick={onClose} />
      <div className={`sheet tier-${card.rarity_tier}`} role="dialog" aria-modal="true" aria-label={card.title}>
        <span className="grab" />
        <div className="sheet-top">
          <span className="cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- pochettes servies par Cover Art Archive */}
            {card.cover_url && <img src={card.cover_url} alt={`Pochette de ${card.title}`} />}
          </span>
          <div>
            <span className="tier-tag">{RARITY_LABELS[card.rarity_tier]}</span>
            <h3>{card.title}</h3>
            <p>{card.artist}{card.release_year ? ` · ${card.release_year}` : ""}</p>
            <Link href={`/album/${card.slug}`} className="btn-link">Voir la fiche complète</Link>
          </div>
        </div>
        <div className="facts">
          <div className="fact"><b>x{card.count}</b><small>Possédés</small></div>
          <div className="fact"><b><i className="coin-i" aria-hidden="true" />{card.cote !== null ? card.cote.toLocaleString("fr-FR") : "—"}</b><small>Cote</small></div>
          <div className="fact"><b>{RARITY_POINTS[card.rarity_tier]}</b><small>Points</small></div>
        </div>
        <div className="listen">
          {PLATFORMS.map(({ key, label }) => {
            const link = card.links?.[key];
            if (!link) return null;
            return (
              <a key={key} href={link.url} target="_blank" rel="noopener noreferrer" className={link.exact ? "" : "search"}>
                {link.exact ? label : `Chercher sur ${label}`}
              </a>
            );
          })}
        </div>
        <div className="sheet-actions">
          <Link href={`/marche/vendre?album=${card.slug}`} className="btn gold">Mettre en vente</Link>
          <Link href="/amis" className="btn">Proposer en échange</Link>
        </div>
      </div>
    </div>
  );
}
