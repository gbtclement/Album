"use client";

import { useRouter } from "next/navigation";
import { CoverImage } from "@/components/cover-image";
import { smallCover } from "@/components/game-ui";
import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { MAX_STOCK, PACK_RATES, PACK_SIZE, type PackKind } from "@/lib/pack-rules";
import type { PackCard } from "@/lib/packs";
import { RARITY_LABELS, RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { openPackAction, setAutoRevealAction } from "./actions";

const tierRank = (tier: RarityTier) => RARITY_TIERS.indexOf(tier);
const NOTE_GLYPHS = ["♪", "♫", "♪", "♬", "♪", "♫", "♪"];

type Note = { glyph: string; x: number; dx: number; r: number; d: number };
type DrawnCard = PackCard & { notes: Note[] };
// id : numéro de l'ouverture, pour repartir de zéro à chaque nouveau pack sans recréer tout l'écran
type Opening = { id: number; kind: PackKind; cards: DrawnCard[] | null; error?: string };
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

  async function open(kind: PackKind) {
    const id = ++openings.current;
    setOpening({ id, kind, cards: null });
    const result = await openPackAction(kind);
    if (result.error || !result.cards || !result.stocks) {
      setOpening({ id, kind, cards: [], error: result.error ?? "Ouverture impossible." });
      return;
    }
    setLiveStocks(result.stocks);
    // De la moins rare à la plus rare : la meilleure carte arrive en dernier
    const sorted = [...result.cards].sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
    setOpening({ id, kind, cards: sorted.map((card) => ({ ...card, notes: card.tier === "legendaire" ? legendNotes() : [] })) });
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
        <button type="button" className="btn lg gold" disabled={classic < 1 || opening !== null} onClick={() => open("classic")}>
          Ouvrir un pack{classic > 0 ? ` (${classic})` : ""}
        </button>
        {current.solo > 0 && (
          <button type="button" className="btn lg solo" disabled={opening !== null} onClick={() => open("solo")}>Ouvrir un Solo ({current.solo})</button>
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
        <div className={`opening${reduced ? " static" : ""}`} role="dialog" aria-modal="true" aria-label="Ouverture de pack">
          <PackOpening
            key={opening.id}
            opening={opening}
            autoReveal={autoReveal}
            reduced={reduced}
            left={opening.kind === "solo" ? current.solo : classic}
            onClose={close}
            onAgain={() => open(opening.kind)}
          />
        </div>
      )}
    </div>
  );
}

// Les cartes d'un pack, une à la fois : on la retourne en la touchant, les flèches passent à la suivante
// ou reviennent sur les précédentes (aussi au clavier et en glissant le doigt)
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
  const { cards } = opening;
  const [dealt, setDealt] = useState(false);
  const [index, setIndex] = useState(0);
  // Sens du dernier déplacement, pour faire glisser la carte du bon côté
  const [direction, setDirection] = useState<"next" | "prev" | "first">("first");
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set());
  const [legendHit, setLegendHit] = useState(0);
  const touchX = useRef<number | null>(null);

  const total = cards?.length ?? 0;
  const card = cards?.[index] ?? null;
  const isFlipped = flipped.has(index);
  const allFlipped = total > 0 && flipped.size === total;

  const flip = useCallback(
    (at: number) => {
      setFlipped((current) => {
        if (current.has(at)) return current;
        const next = new Set(current);
        next.add(at);
        return next;
      });
      if (cards?.[at]?.tier === "legendaire") setLegendHit((count) => count + 1);
    },
    [cards],
  );

  const goTo = useCallback(
    (at: number) => {
      if (at < 0 || at >= total || at === index) return;
      setDirection(at > index ? "next" : "prev");
      setIndex(at);
    },
    [index, total],
  );

  // Flèche suivante : retourne d'abord la carte si elle est encore cachée
  const next = useCallback(() => {
    if (!isFlipped) flip(index);
    else goTo(index + 1);
  }, [flip, goTo, index, isFlipped]);

  // Vinyle qui accélère puis première carte
  useEffect(() => {
    if (!cards || cards.length === 0) return;
    const timer = window.setTimeout(() => setDealt(true), reduced ? 0 : 950);
    return () => window.clearTimeout(timer);
  }, [cards, reduced]);

  // Réglage « Révéler automatiquement » : la carte affichée se retourne seule
  useEffect(() => {
    if (!dealt || !autoReveal || isFlipped) return;
    const timer = window.setTimeout(() => flip(index), reduced ? 0 : 450);
    return () => window.clearTimeout(timer);
  }, [dealt, autoReveal, isFlipped, flip, index, reduced]);

  // Clavier : flèches gauche et droite, Entrée ou Espace pour retourner
  useEffect(() => {
    if (!dealt) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") goTo(index - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dealt, next, goTo, index]);

  const fresh = cards?.filter((item) => item.isNew).length ?? 0;
  const last = index === total - 1;

  return (
    <>
      {/* Léger flash doré à chaque légendaire retournée (la clé relance l'animation) */}
      {legendHit > 0 && <span key={legendHit} className="legend-flash" aria-hidden="true" />}
      {!reduced && !dealt && <div className={`op-disc-wrap${cards ? " go" : ""}`}><div className="op-disc" /></div>}
      {/* Pochettes du pack chargées pendant que le vinyle tourne : elles apparaissent dès qu'on retourne une carte */}
      {cards && (
        <div className="op-preload" aria-hidden="true">
          {cards.map((item, i) => (
            <span key={i}><CoverImage src={smallCover(item.coverUrl)} fallback={item.coverUrl} title="" sizes="240px" priority /></span>
          ))}
        </div>
      )}

      {opening.error ? (
        <>
          <h2 className="op-title">Ouverture impossible</h2>
          <p className="op-hint">{opening.error}</p>
          <div className="op-actions"><button type="button" className="btn lg alt" onClick={onClose}>Fermer</button></div>
        </>
      ) : (
        cards && card && dealt && (
          <>
            <h2 className="op-title">{opening.kind === "solo" ? "Pack Solo" : "Pack"}</h2>
            {total > 1 && (
              <div className="op-dots" aria-label={`Carte ${index + 1} sur ${total}`}>
                {cards.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${flipped.has(i) ? `seen tier-${item.tier}` : ""}${i === index ? " cur" : ""}`}
                    aria-label={`Carte ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                    disabled={!flipped.has(i) && i !== index}
                    onClick={() => goTo(i)}
                  />
                ))}
              </div>
            )}

            <div
              className="op-stage"
              onTouchStart={(event) => {
                touchX.current = event.touches[0].clientX;
              }}
              onTouchEnd={(event) => {
                if (touchX.current === null) return;
                const dx = event.changedTouches[0].clientX - touchX.current;
                touchX.current = null;
                if (dx < -40) next();
                else if (dx > 40) goTo(index - 1);
              }}
            >
              <button type="button" className="op-arrow" aria-label="Carte précédente" disabled={index === 0} onClick={() => goTo(index - 1)}>‹</button>
              <div key={index} className={`op-slot ${direction}`}>
                <button
                  type="button"
                  className={`pcard tier-${card.tier}${isFlipped ? " flipped" : ""}`}
                  aria-label={isFlipped ? `${card.title}, ${card.artist}, ${RARITY_LABELS[card.tier]}` : "Carte face cachée, la retourner"}
                  onClick={() => flip(index)}
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
                      <span className="art"><CoverImage src={smallCover(card.coverUrl)} fallback={card.coverUrl} title={card.title} sizes="240px" priority /></span>
                      {card.isNew && <span className="new">Nouveau</span>}
                      <span className="meta">
                        <span className="t">{card.title}</span>
                        <span className="a">{card.artist}</span>
                        <span className="tier">{RARITY_LABELS[card.tier]}</span>
                      </span>
                    </span>
                  </span>
                </button>
              </div>
              <button
                type="button"
                className="op-arrow"
                aria-label={isFlipped ? "Carte suivante" : "Retourner la carte"}
                disabled={isFlipped && last}
                onClick={next}
              >›</button>
            </div>

            <p className="op-hint">
              {allFlipped
                ? `Ajouté à ta collection · ${fresh === 0 ? "aucun nouvel album" : fresh === 1 ? "1 nouvel album" : `${fresh} nouveaux albums`}`
                : !isFlipped
                  ? autoReveal ? "Révélation..." : "Touche la carte pour la retourner"
                  : `Carte ${index + 1} sur ${total} · flèche pour la suivante`}
            </p>

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
