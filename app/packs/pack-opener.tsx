"use client";

import { useRouter } from "next/navigation";
import { CoverImage } from "@/components/cover-image";
import { smallCover } from "@/components/game-ui";
import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { PACK_LABELS, PACK_RATES, PACK_SIZE, type PackKind } from "@/lib/pack-rules";
import { PASS_XP } from "@/lib/pass-rules";
import type { PackCard } from "@/lib/packs";
import { RARITY_LABELS, RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { openPackAction, setAutoRevealAction, type Stocks } from "./actions";

const tierRank = (tier: RarityTier) => RARITY_TIERS.indexOf(tier);
const NOTE_GLYPHS = ["♪", "♫", "♪", "♬", "♪", "♫", "♪"];

type Note = { glyph: string; x: number; dx: number; r: number; d: number };
type DrawnCard = PackCard & { notes: Note[] };
// id : numéro de l'ouverture, pour repartir de zéro à chaque nouveau pack sans recréer tout l'écran
type Opening = { id: number; kind: PackKind; cards: DrawnCard[] | null; error?: string };

// Packs gagnés autres que classiques : bouton d'ouverture, classe de couleur et libellé de la réserve
const SPECIAL_PACKS: Array<{ kind: "legendary" | "epic" | "solo"; button: string; one: string; many: string }> = [
  { kind: "legendary", button: "Ouvrir un Légendaire", one: "pack Légendaire", many: "packs Légendaires" },
  { kind: "epic", button: "Ouvrir un Épique", one: "pack Épique", many: "packs Épiques" },
  { kind: "solo", button: "Ouvrir un Solo", one: "pack Solo", many: "packs Solo" },
];

// Classe du bouton « Encore un » selon le type de pack
const AGAIN_CLASS: Record<PackKind, string> = { classic: "gold", solo: "solo", epic: "epic", legendary: "legendary" };

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
  // Réserves renvoyées par le serveur après une ouverture (affichées sans attendre le rechargement de la page)
  const [liveStocks, setLiveStocks] = useState<Stocks | null>(null);
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [, startTransition] = useTransition();
  const openings = useRef(0);
  // Cartes de la série d'ouvertures en cours (de l'arrivée sur l'écran d'ouverture à « Continuer ») pour le bilan
  const [series, setSeries] = useState<PackCard[][]>([]);
  const [recap, setRecap] = useState<PackCard[][] | null>(null);
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
    const drawn = result.cards;
    setSeries((current) => [...current, drawn]);
    // Le vinyle de la barre du bas et le HUD sont rendus côté serveur : on les recalcule tout de suite,
    // sans attendre la fermeture (l'ouverture en cours garde son état)
    router.refresh();
    // De la moins rare à la plus rare : la meilleure carte arrive en dernier
    const sorted = [...result.cards].sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
    setOpening({ id, kind, cards: sorted.map((card) => ({ ...card, notes: card.tier === "legendaire" ? legendNotes() : [] })) });
  }

  function close() {
    setOpening(null);
    setLiveStocks(null);
    // Plusieurs packs d'affilée : un bilan avant de revenir à la page (un seul pack : l'écran d'ouverture suffit)
    if (series.length > 1) setRecap(series);
    setSeries([]);
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
        {current.stock > 0 ? `${current.stock} pack${current.stock > 1 ? "s" : ""} prêt${current.stock > 1 ? "s" : ""}` : "Aucun pack prêt"} · +1 toutes les 10 min · {current.max} max
      </p>
      {(current.bonus > 0 || SPECIAL_PACKS.some((pack) => current[pack.kind] > 0)) && (
        <div className="pack-stock">
          {current.bonus > 0 && <span><i className="vinyl-i" aria-hidden="true" />{current.bonus} pack{current.bonus > 1 ? "s" : ""} gagné{current.bonus > 1 ? "s" : ""}</span>}
          {SPECIAL_PACKS.filter((pack) => current[pack.kind] > 0).map((pack) => (
            <span key={pack.kind}><i className={`vinyl-i ${pack.kind}`} aria-hidden="true" />{current[pack.kind]} {current[pack.kind] > 1 ? pack.many : pack.one}</span>
          ))}
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
        {SPECIAL_PACKS.filter((pack) => current[pack.kind] > 0).map((pack) => (
          <button key={pack.kind} type="button" className={`btn lg ${pack.kind}`} disabled={opening !== null} onClick={() => open(pack.kind)}>
            {pack.button} ({current[pack.kind]})
          </button>
        ))}
      </div>
      <p className="sub pack-help">
        Un pack contient {PACK_SIZE} albums, un pack Solo un seul. Les packs Épique et Légendaire garantissent une carte de leur rareté.
      </p>
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
            left={opening.kind === "classic" ? classic : current[opening.kind]}
            onClose={close}
            onAgain={() => open(opening.kind)}
          />
        </div>
      )}

      {recap && (
        <div className={`opening${reduced ? " static" : ""}`} role="dialog" aria-modal="true" aria-label="Bilan des packs ouverts">
          <SeriesRecap packs={recap} onClose={() => setRecap(null)} />
        </div>
      )}
    </div>
  );
}

// Bilan d'une série de packs : cartes par rareté, nouveaux albums, XP du Disque d'Or et meilleures cartes
function SeriesRecap({ packs, onClose }: { packs: PackCard[][]; onClose: () => void }) {
  const cards = packs.flat();
  const fresh = cards.filter((card) => card.isNew).length;
  const xp = cards.reduce((sum, card) => sum + PASS_XP[card.tier], 0);
  const best = [...cards].sort((a, b) => tierRank(b.tier) - tierRank(a.tier)).filter((card) => tierRank(card.tier) >= tierRank("rare")).slice(0, 6);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => (event.key === "Escape" || event.key === "Enter") && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="recap">
      <h2 className="op-title">Bilan : {packs.length} packs</h2>
      <div className="facts">
        <div className="fact"><b>{cards.length}</b><small>Cartes</small></div>
        <div className="fact"><b>{fresh}</b><small>Nouveaux albums</small></div>
        <div className="fact"><b>+{xp.toLocaleString("fr-FR")}</b><small>XP Disque d&apos;Or</small></div>
      </div>
      <div className="rates">
        {[...RARITY_TIERS].reverse().map((tier) => {
          const count = cards.filter((card) => card.tier === tier).length;
          return (
            <div key={tier} className={`rate tier-${tier}${count === 0 ? " none" : ""}`}>
              <span><i />{RARITY_LABELS[tier]}</span>
              <b>{count}</b>
            </div>
          );
        })}
      </div>
      {best.length > 0 && (
        <>
          <h3 className="label">Meilleures cartes</h3>
          <div className="recap-best">
            {best.map((card, i) => (
              <span key={`${card.slug}-${i}`} className={`recap-card tier-${card.tier}`} title={`${card.title}, ${card.artist}`}>
                <CoverImage src={smallCover(card.coverUrl)} fallback={card.coverUrl} title={card.title} sizes="96px" />
                {card.isNew && <em>Nouveau</em>}
              </span>
            ))}
          </div>
        </>
      )}
      <div className="op-actions">
        <button type="button" className="btn lg gold" onClick={onClose} autoFocus>Fermer</button>
      </div>
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
            <h2 className="op-title">{PACK_LABELS[opening.kind]}</h2>
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
                  {left > 0 && <button type="button" className={`btn lg ${AGAIN_CLASS[opening.kind]}`} onClick={onAgain}>Encore un ({left})</button>}
                </>
              )}
            </div>
          </>
        )
      )}
    </>
  );
}
