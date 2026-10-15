"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { matchesSearch, SearchBar, TierChips } from "@/components/game-controls";
import { CoverImage } from "@/components/cover-image";
import { smallCover } from "@/components/game-ui";
import type { CollectionCard } from "@/lib/collection";
import { DUST_PER_DUPLICATE, pressableCopies } from "@/lib/dust-rules";
import { pressAlbumAction } from "./actions";
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

  // Les cartes rangées par rareté, comme les intercalaires d'un bac de disquaire (déjà triées de la plus rare à la moins rare)
  const groups = RARITY_TIERS.map((value) => ({ tier: value, cards: visible.filter((card) => card.rarity_tier === value) }))
    .filter((group) => group.cards.length > 0)
    .reverse();

  return (
    <>
      <div className="coll-toolbar">
        <SearchBar id="q-collection" value={query} onChange={setQuery} placeholder="Rechercher un album ou un artiste" />
        <TierChips value={tier} onChange={setTier} />
      </div>

      {visible.length === 0 ? (
        <p className="empty">
          {query ? `Aucun album de ta collection ne correspond à « ${query} ».` : "Aucune carte de cette rareté pour l'instant. Ouvre des packs pour en trouver."}
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.tier} className={`crate tier-${group.tier}`} aria-label={RARITY_LABELS[group.tier]}>
            <h2 className="crate-head">
              <span>{RARITY_LABELS[group.tier]}</span>
              <small>{group.cards.length}</small>
            </h2>
            <div className="crate-grid">
              {group.cards.map((card) => (
                <button key={card.slug} type="button" className="sleeve" onClick={() => setSelected(card)}>
                  <span className="sleeve-art">
                    <CoverImage src={smallCover(card.cover_url)} fallback={card.cover_url} title={card.title} lazy sizes="(min-width: 900px) 150px, 30vw" />
                    {card.count > 1 && <b aria-label={`${card.count} exemplaires`}>×{card.count}</b>}
                  </span>
                  <span className="sleeve-t">{card.title}</span>
                  <span className="sleeve-a">{card.artist}</span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      {selected && <AlbumSheet card={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function AlbumSheet({ card, onClose }: { card: CollectionCard; onClose: () => void }) {
  const pressable = pressableCopies(card.count, card.reserved);
  return (
    <div className="sheet-wrap">
      <button type="button" className="sheet-back" aria-label="Fermer" onClick={onClose} />
      <div className={`sheet tier-${card.rarity_tier}`} role="dialog" aria-modal="true" aria-label={card.title}>
        <span className="grab" />
        <div className="sheet-top">
          <span className="cover">
            <CoverImage src={card.cover_url} title={card.title} alt={`Pochette de ${card.title}`} sizes="120px" />
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
        {pressable > 0 && (
          <form action={pressAlbumAction} className="sheet-press">
            <input type="hidden" name="slug" value={card.slug} />
            <button type="submit" className="btn block">
              <span className="dust-i" aria-hidden="true" />
              Presser {pressable > 1 ? `les ${pressable} doublons` : "le doublon"} (+{pressable * DUST_PER_DUPLICATE[card.rarity_tier]})
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
