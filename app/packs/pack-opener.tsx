"use client";

import { useRouter } from "next/navigation";
import { CoverImage } from "@/components/cover-image";
import { smallCover } from "@/components/game-ui";
import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { MAX_OPEN_AT_ONCE, MAX_STOCK, PACK_RATES, PACK_SIZE, type PackKind } from "@/lib/pack-rules";
import type { PackCard } from "@/lib/packs";
import { RARITY_LABELS, RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { openPacksAction, setAutoRevealAction } from "./actions";

const tierRank = (tier: RarityTier) => RARITY_TIERS.indexOf(tier);
const NOTE_GLYPHS = ["♪", "♫", "♪", "♬", "♪", "♫", "♪"];

type Note = { glyph: string; x: number; dx: number; r: number; d: number };
type DrawnCard = PackCard & { notes: Note[] };
// id : numéro de l'ouverture, pour repartir de zéro à chaque nouveau pack sans recréer tout l'écran
type Opening = { id: number; kind: PackKind; multi: boolean; packs: number; cards: DrawnCard[] | null; error?: string };
type Stocks = { stock: number; bonus: number; solo: number };

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

export function PackRoom({ stocks, autoReveal: initialAuto }: { stocks: Stocks; autoReveal: boolean }) {
  const router = useRouter();
  const [autoReveal, setAutoReveal] = useState(initialAuto);
  const [opening, setOpening] = useState<Opening | null>(null);
  // Réserves renvoyées par le serveur après une ouverture (la page n'est rechargée qu'à la fermeture)
  const [liveStocks, setLiveStocks] = useState<Stocks | null>(null);
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [, startTransition] = useTransition();
  const openings = useRef(0);
  const current = liveStocks ?? stocks;
  // Packs classiques : le stock qui se recharge, puis les packs gagnés
  const classic = current.stock + current.bonus;
  const allAtOnce = Math.min(classic, MAX_OPEN_AT_ONCE);

  async function open(count: number, kind: PackKind) {
    const id = ++openings.current;
    const multi = count > 1;
    setOpening({ id, kind, multi, packs: count, cards: null });
    const result = await openPacksAction(count, kind);
    if (result.error || !result.cards || !result.stocks) {
      setOpening({ id, kind, multi, packs: count, cards: [], error: result.error ?? "Ouverture impossible." });
      return;
    }
    setLiveStocks(result.stocks);
    // Un pack seul se révèle de la moins rare à la plus rare ; plusieurs packs : les plus rares d'abord
    const sorted = [...result.cards].sort((a, b) => (multi ? tierRank(b.tier) - tierRank(a.tier) : tierRank(a.tier) - tierRank(b.tier)));
    setOpening({
      id,
      kind,
      multi,
      packs: result.opened ?? count,
      cards: sorted.map((card) => ({ ...card, notes: card.tier === "legendaire" ? legendNotes() : [] })),
    });
  }

  function close() {
    setOpening(null);
    setLiveStocks(null);
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
        {current.stock > 0 ? `${current.stock} pack${current.stock > 1 ? "s" : ""} prêt${current.stock > 1 ? "s" : ""}` : "Aucun pack prêt"} · +1 toutes les 5 min · {MAX_STOCK} max
      </p>
      {(current.bonus > 0 || current.solo > 0) && (
        <div className="pack-stock">
          {current.bonus > 0 && <span><i className="vinyl-i" aria-hidden="true" />{current.bonus} pack{current.bonus > 1 ? "s" : ""} gagné{current.bonus > 1 ? "s" : ""}</span>}
          {current.solo > 0 && <span><i className="vinyl-i solo" aria-hidden="true" />{current.solo} pack{current.solo > 1 ? "s" : ""} Solo</span>}
        </div>
      )}
      <div className="disc">
        <div className="disc-rot"><span className="hub" /></div>
        <span className="sheen" />
      </div>
      <div className="pack-actions">
        <button type="button" className="btn lg gold" disabled={classic < 1 || opening !== null} onClick={() => open(1, "classic")}>Ouvrir 1</button>
        <button type="button" className="btn lg alt" disabled={classic < 2 || opening !== null} onClick={() => open(allAtOnce, "classic")}>Tout ouvrir ({allAtOnce})</button>
        {current.solo > 0 && (
          <button type="button" className="btn lg solo" disabled={opening !== null} onClick={() => open(1, "solo")}>Ouvrir un Solo ({current.solo})</button>
        )}
      </div>
      <p className="sub" style={{ margin: 0 }}>Un pack contient {PACK_SIZE} albums, un pack Solo un seul. Les quêtes en rapportent.</p>
      <label className="auto-row">
        <button type="button" className="toggle" role="switch" aria-checked={autoReveal} aria-label="Révéler les cartes automatiquement" onClick={toggleAuto} />
        Révéler les cartes automatiquement
      </label>
      <div className="rates">
        <h2 className="label">Chances par carte</h2>
        {[...RARITY_TIERS].reverse().map((tier) => (
          <div key={tier} className={`rate tier-${tier}`}>
            <span><i />{RARITY_LABELS[tier]}</span>
            <b>{String(PACK_RATES[tier] * 100).replace(".", ",")} %</b>
          </div>
        ))}
      </div>

      {/* Le fond reste affiché pendant toute l'ouverture (attente du serveur comprise) : pas de clignotement.
          Seul le contenu repart de zéro à chaque nouveau pack (clé = numéro de l'ouverture). */}
      {opening && (
        <div className={`opening${opening.multi ? " multi" : ""}${reduced ? " static" : ""}`} role="dialog" aria-modal="true" aria-label="Ouverture de pack">
          <PackOpening
            key={opening.id}
            opening={opening}
            autoReveal={autoReveal}
            reduced={reduced}
            left={opening.kind === "solo" ? current.solo : classic}
            onClose={close}
            onAgain={() => open(1, opening.kind)}
          />
        </div>
      )}
    </div>
  );
}

function PackOpening({
  opening,
  autoReveal,
  reduced,
  left,
  onClose,
  onAgain,
}: {
  opening: Opening;
  autoReveal: boolean;
  reduced: boolean;
  left: number;
  onClose: () => void;
  onAgain: () => void;
}) {
  const { cards, multi } = opening;
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
    <>
      {/* Léger flash doré à chaque légendaire retournée (la clé relance l'animation) */}
      {legendHit > 0 && <span key={legendHit} className="legend-flash" aria-hidden="true" />}
      {!reduced && !dealt && <div className={`op-disc-wrap${cards ? " go" : ""}`}><div className="op-disc" /></div>}

      {opening.error ? (
        <>
          <h2 className="op-title">Ouverture impossible</h2>
          <p className="op-hint">{opening.error}</p>
          <div className="op-actions"><button type="button" className="btn lg alt" onClick={onClose}>Fermer</button></div>
        </>
      ) : (
        cards && dealt && (
          <>
            <h2 className="op-title">{multi ? `${opening.packs} packs ouverts` : opening.kind === "solo" ? "Pack Solo ouvert" : "Pack ouvert"}</h2>
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
                      <span className="art"><CoverImage src={smallCover(card.coverUrl)} fallback={card.coverUrl} title={card.title} sizes="124px" /></span>
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
                  {left > 0 && <button type="button" className={`btn lg ${opening.kind === "solo" ? "solo" : "gold"}`} onClick={onAgain}>Encore un ({left})</button>}
                </>
              )}
            </div>
          </>
        )
      )}
    </>
  );
}
