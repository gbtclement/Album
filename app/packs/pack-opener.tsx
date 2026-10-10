"use client";

import { useRouter } from "next/navigation";
import { CoverImage } from "@/components/cover-image";
import { smallCover } from "@/components/game-ui";
import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { MAX_STOCK, PACK_RATES } from "@/lib/pack-rules";
import type { PackCard } from "@/lib/packs";
import { RARITY_LABELS, RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { openPacksAction, setAutoRevealAction } from "./actions";

const tierRank = (tier: RarityTier) => RARITY_TIERS.indexOf(tier);
const NOTE_GLYPHS = ["♪", "♫", "♪", "♬", "♪", "♫", "♪"];

type Note = { glyph: string; x: number; dx: number; r: number; d: number };
type DrawnCard = PackCard & { notes: Note[] };
type Opening = { multi: boolean; packs: number; cards: DrawnCard[] | null; error?: string };

// Trajets des notes de musique d'une carte légendaire, tirés au moment de l'ouverture
function legendNotes(): Note[] {
  return NOTE_GLYPHS.map((glyph, i) => ({
    glyph,
    x: 8 + i * 13 + Math.random() * 6,
    dx: Math.round((Math.random() - 0.5) * 50),
    r: Math.round((Math.random() - 0.5) * 50),
    d: 0.45 + i * 0.12 + Math.random() * 0.15,
  }));
}

export function PackRoom({ stock, autoReveal: initialAuto }: { stock: number; autoReveal: boolean }) {
  const router = useRouter();
  const [autoReveal, setAutoReveal] = useState(initialAuto);
  const [opening, setOpening] = useState<Opening | null>(null);
  // Stock renvoyé par le serveur après une ouverture (la page n'est rechargée qu'à la fermeture)
  const [liveStock, setLiveStock] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const currentStock = liveStock ?? stock;

  async function open(count: number) {
    const multi = count > 1;
    setOpening({ multi, packs: count, cards: null });
    const result = await openPacksAction(count);
    if (result.error || !result.cards) {
      setOpening({ multi, packs: count, cards: [], error: result.error ?? "Ouverture impossible." });
      return;
    }
    setLiveStock(result.stock ?? 0);
    // Un pack seul se révèle de la moins rare à la plus rare ; plusieurs packs : les plus rares d'abord
    const sorted = [...result.cards].sort((a, b) => (multi ? tierRank(b.tier) - tierRank(a.tier) : tierRank(a.tier) - tierRank(b.tier)));
    setOpening({
      multi,
      packs: result.opened ?? count,
      cards: sorted.map((card) => ({ ...card, notes: card.tier === "legendaire" ? legendNotes() : [] })),
    });
  }

  function close() {
    setOpening(null);
    setLiveStock(null);
    router.refresh();
  }

  function toggleAuto() {
    const next = !autoReveal;
    setAutoReveal(next);
    startTransition(() => setAutoRevealAction(next));
  }

  return (
    <div className="big-pack">
      <h1>Packs</h1>
      <p className="sub">
        {currentStock > 0 ? `${currentStock} pack${currentStock > 1 ? "s" : ""} prêt${currentStock > 1 ? "s" : ""}` : "Aucun pack prêt"} · +1 toutes les 5 min · {MAX_STOCK} max
      </p>
      <div className="disc">
        <div className="disc-rot"><span className="hub" /></div>
        <span className="sheen" />
      </div>
      <div className="pack-actions">
        <button type="button" className="btn lg gold" disabled={currentStock < 1 || opening !== null} onClick={() => open(1)}>Ouvrir 1</button>
        <button type="button" className="btn lg alt" disabled={currentStock < 2 || opening !== null} onClick={() => open(currentStock)}>Tout ouvrir ({currentStock})</button>
      </div>
      <label className="auto-row">
        <button type="button" className="toggle" role="switch" aria-checked={autoReveal} aria-label="Révéler les cartes automatiquement" onClick={toggleAuto} />
        Révéler les cartes automatiquement
      </label>
      <div className="rates">
        <div className="label">Chances par carte</div>
        {[...RARITY_TIERS].reverse().map((tier) => (
          <div key={tier} className={`rate tier-${tier}`}>
            <span><i />{RARITY_LABELS[tier]}</span>
            <b>{String(PACK_RATES[tier] * 100).replace(".", ",")} %</b>
          </div>
        ))}
      </div>

      {opening && (
        <PackOpening
          key={opening.cards ? "cards" : "waiting"}
          opening={opening}
          autoReveal={autoReveal}
          stockLeft={currentStock}
          onClose={close}
          onAgain={() => open(1)}
        />
      )}
    </div>
  );
}

function PackOpening({
  opening,
  autoReveal,
  stockLeft,
  onClose,
  onAgain,
}: {
  opening: Opening;
  autoReveal: boolean;
  stockLeft: number;
  onClose: () => void;
  onAgain: () => void;
}) {
  const { cards, multi } = opening;
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [dealt, setDealt] = useState(false);
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set());
  const [legendHit, setLegendHit] = useState(0);
  const timers = useRef<number[]>([]);

  const flip = useCallback(
    (index: number) => {
      setFlipped((current) => {
        if (current.has(index)) return current;
        const next = new Set(current);
        next.add(index);
        return next;
      });
      if (cards?.[index]?.tier === "legendaire") setLegendHit((count) => count + 1);
    },
    [cards],
  );

  // Vinyle qui accélère, cartes distribuées, puis révélation automatique si le réglage est activé
  useEffect(() => {
    if (!cards || cards.length === 0) return;
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    const dealDelay = reduced ? 0 : 950;
    later(() => setDealt(true), dealDelay);
    if (autoReveal) {
      const step = multi ? 22 : 90;
      const start = reduced ? 0 : dealDelay + cards.length * step + 450;
      cards.forEach((_, i) => later(() => flip(i), multi ? start + i * 45 : start + i * 520 + (i === cards.length - 1 ? 350 : 0)));
    }
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, [cards, autoReveal, multi, reduced, flip]);

  const allFlipped = cards !== null && cards.length > 0 && flipped.size === cards.length;
  const fresh = cards?.filter((card) => card.isNew).length ?? 0;
  const counts = RARITY_TIERS.map((tier) => [tier, cards?.filter((card) => card.tier === tier).length ?? 0] as const).filter(([, n]) => n > 0).reverse();

  return (
    <div className={`opening${multi ? " multi" : ""}${reduced ? " static" : ""}`} role="dialog" aria-modal="true" aria-label="Ouverture de pack">
      {/* Léger flash doré à chaque légendaire retournée (la clé relance l'animation) */}
      {legendHit > 0 && <span key={legendHit} className="legend-flash" aria-hidden="true" />}
      {!reduced && !dealt && <div className={`op-disc ${cards ? "spin" : "waiting"}`} />}

      {opening.error ? (
        <>
          <h2 className="op-title">Ouverture impossible</h2>
          <p className="op-hint">{opening.error}</p>
          <div className="op-actions"><button type="button" className="btn lg alt" onClick={onClose}>Fermer</button></div>
        </>
      ) : (
        cards && dealt && (
          <>
            <h2 className="op-title">{multi ? `${opening.packs} packs ouverts` : "Pack ouvert"}</h2>
            {multi && (
              <div className="op-sum">
                {counts.map(([tier, n]) => <span key={tier} className={`tier-${tier}`}>{n} {RARITY_LABELS[tier]}</span>)}
              </div>
            )}
            <p className="op-hint">
              {allFlipped ? (
                `Ajouté à ta collection · ${fresh === 0 ? "aucun nouvel album" : fresh === 1 ? "1 nouvel album" : `${fresh} nouveaux albums`}`
              ) : (
                <>
                  {autoReveal ? "Révélation automatique" : `Touche ${multi ? "les cartes" : "chaque carte"} pour ${multi ? "les" : "la"} retourner`}
                  {" · "}
                  <button type="button" className="btn-link" onClick={() => cards.forEach((_, i) => flip(i))}>tout révéler</button>
                </>
              )}
            </p>
            <div className={`op-cards ${reduced ? "" : "dealt"}`} style={{ "--step": multi ? "22ms" : "90ms" } as CSSProperties}>
              {cards.map((card, i) => (
                <button
                  key={`${card.slug}-${i}`}
                  type="button"
                  className={`pcard tier-${card.tier}${flipped.has(i) ? " flipped" : ""}`}
                  style={{ "--i": i } as CSSProperties}
                  aria-label={flipped.has(i) ? `${card.title}, ${RARITY_LABELS[card.tier]}` : "Carte face cachée, la retourner"}
                  onClick={() => flip(i)}
                >
                  {tierRank(card.tier) >= 2 && <span className="aura" />}
                  {card.tier === "legendaire" && (
                    <>
                      <span className="waves"><i /><i /><i /></span>
                      <span className="notes" aria-hidden="true">
                        {card.notes.map((note, n) => (
                          <i key={n} style={{ "--x": `${note.x}%`, "--dx": `${note.dx}px`, "--r": `${note.r}deg`, "--d": `${note.d.toFixed(2)}s` } as CSSProperties}>{note.glyph}</i>
                        ))}
                      </span>
                    </>
                  )}
                  <span className="inner">
                    <span className="face back" />
                    <span className="face front">
                      <span className="art"><CoverImage src={smallCover(card.coverUrl)} fallback={card.coverUrl} title={card.title} /></span>
                      {card.isNew && <span className="new">Nouveau</span>}
                      <span className="meta"><span className="t">{card.title}</span><span className="tier">{RARITY_LABELS[card.tier]}</span></span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="op-actions">
              {allFlipped && (
                <>
                  <button type="button" className="btn lg alt" onClick={onClose}>Continuer</button>
                  {stockLeft > 0 && <button type="button" className="btn lg gold" onClick={onAgain}>Encore un ({stockLeft})</button>}
                </>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
