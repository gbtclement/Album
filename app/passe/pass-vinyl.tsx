"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { CheckIcon, CrownIcon, DiscIcon, LockIcon } from "@/components/icons";
import { claimPassTierAction } from "./actions";

// Disque d'Or : les 30 paliers sont posés sur le sillon d'un vinyle, une spirale qui part du bord et finit près de l'étiquette.
// Comme sur une platine, le bras reste au même angle : c'est le disque qui tourne (sens des aiguilles d'une montre)
// pour amener la position actuelle sous le diamant. Le bras se rapproche seulement du centre au fil des paliers.

export type CellState = "ready" | "claimed" | "locked" | "todo";
export type PassCell = { label: string; kind: "solo" | "classic" | "epic" | "legendary"; state: CellState };
export type PassTier = { tier: number; free: PassCell; premium: PassCell };

type Props = {
  tiers: PassTier[];
  // Position sur le sillon, en paliers (ex. 12,4 = palier 12 atteint, 40 % du suivant)
  position: number;
  level: number;
  xpToNext: number | null;
  premium: boolean;
};

const SIZE = 400;
const CENTER = SIZE / 2;
const R_OUTER = 180;
const R_INNER = 84;
const TURNS = 2.6;
const TOTAL = 30;
// Angle fixe du diamant (degrés, 0 = à droite, sens des aiguilles d'une montre) : en haut à droite, sous le pivot du bras
const NEEDLE_ANGLE = -40;

// Angle (degrés) et rayon du sillon pour une position de 0 (bord du disque) à 30 (dernier palier, près de l'étiquette).
// La spirale tourne en sens inverse des aiguilles d'une montre : le disque, lui, tourne dans le sens des aiguilles.
function polarAt(position: number) {
  const t = Math.min(1, Math.max(0, position / TOTAL));
  return { angle: -90 - t * TURNS * 360, radius: R_OUTER - t * (R_OUTER - R_INNER) };
}

function pointAt(position: number) {
  const { angle, radius } = polarAt(position);
  const rad = (angle * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function groovePath(to: number) {
  const steps = Math.max(2, Math.ceil((to / TOTAL) * 480));
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const { x, y } = pointAt((to * i) / steps);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

const FULL_GROOVE = groovePath(TOTAL);
const KIND_NAMES = { solo: "Solo", classic: "Pack", epic: "Épique", legendary: "Légendaire" };

function tierStatus(row: PassTier, premium: boolean) {
  if (row.free.state === "ready" || (premium && row.premium.state === "ready")) return "ready";
  if (row.free.state === "todo") return "todo";
  return "reached";
}

export function PassVinyl({ tiers, position, level, xpToNext, premium }: Props) {
  const firstReady = tiers.find((row) => tierStatus(row, premium) === "ready")?.tier;
  const [selected, setSelected] = useState(firstReady ?? Math.min(TOTAL, level + 1));
  const row = tiers[selected - 1];
  // Rotation du disque qui amène la position actuelle sous le diamant ; la page s'ouvre disque à l'arrêt (0°)
  // puis il tourne jusqu'à sa place, ce qui évite aussi toute différence entre le rendu serveur et le navigateur
  const target = NEEDLE_ANGLE - polarAt(position).angle;
  const [spin, setSpin] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSpin(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);
  const needleRadius = polarAt(position).radius;
  const needle = {
    x: CENTER + needleRadius * Math.cos((NEEDLE_ANGLE * Math.PI) / 180),
    y: CENTER + needleRadius * Math.sin((NEEDLE_ANGLE * Math.PI) / 180),
  };
  // Pivot du bras, en haut à droite, hors du disque
  const pivot = { x: SIZE + 4, y: 6 };

  const onKey = (event: KeyboardEvent, tier: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected(tier);
    }
  };

  return (
    <div className="sillon">
      <div className="sillon-disc">
        <svg viewBox={`-12 -12 ${SIZE + 24} ${SIZE + 24}`} className="sillon-svg" role="group" aria-label="Paliers du Disque d'Or">
          <g className="sillon-spin" style={{ transform: `rotate(${spin}deg)` }}>
          <path d={FULL_GROOVE} className="sillon-groove" />
          {position > 0 && <path d={groovePath(position)} className="sillon-progress" />}
          {tiers.map((item) => {
            const { x, y } = pointAt(item.tier);
            const status = tierStatus(item, premium);
            const milestone = item.tier % 5 === 0;
            const best = item.premium.kind === "legendary" || item.free.kind === "legendary" ? "legendary" : item.free.kind === "epic" || item.premium.kind === "epic" ? "epic" : "base";
            return (
              <g
                key={item.tier}
                role="button"
                tabIndex={0}
                aria-label={`Palier ${item.tier} : ${item.free.label}${status === "ready" ? ", à prendre" : ""}`}
                aria-pressed={selected === item.tier}
                className={`sillon-dot ${status} k-${best}${milestone ? " big" : ""}${selected === item.tier ? " on" : ""}`}
                transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
                onClick={() => setSelected(item.tier)}
                onKeyDown={(event) => onKey(event, item.tier)}
              >
                <circle r={22} className="hit" />
                {status === "ready" && <circle r={milestone ? 17 : 13} className="pulse" />}
                <circle r={milestone ? 12 : 8} className="dot" />
                {/* Le numéro tourne en sens inverse du disque pour rester droit */}
                {(milestone || selected === item.tier) && <text dy="0.35em" style={{ transform: `rotate(${-spin}deg)` }}>{item.tier}</text>}
              </g>
            );
          })}
          </g>
          {/* Bras de la platine : du pivot jusqu'au diamant posé sur la position actuelle */}
          <g className="sillon-arm" aria-hidden="true">
            <line x1={pivot.x} y1={pivot.y} x2={needle.x} y2={needle.y} />
            <circle cx={pivot.x} cy={pivot.y} r={13} className="pivot" />
            <circle cx={needle.x} cy={needle.y} r={6} className="head" />
          </g>
        </svg>
        <div className="sillon-label" aria-hidden="true">
          <small>Niveau</small>
          <b>{level}</b>
        </div>
      </div>

      <section className="sillon-card" aria-live="polite">
        <div className="sillon-card-head">
          <button type="button" className="sillon-nav" onClick={() => setSelected(Math.max(1, selected - 1))} disabled={selected === 1} aria-label="Palier précédent">‹</button>
          <div>
            <h2>Palier {row.tier}</h2>
            <p>
              {row.free.state === "todo"
                ? row.tier === level + 1 && xpToNext !== null
                  ? `Encore ${xpToNext.toLocaleString("fr-FR")} XP`
                  : `Pas encore atteint`
                : "Atteint"}
            </p>
          </div>
          <button type="button" className="sillon-nav" onClick={() => setSelected(Math.min(TOTAL, selected + 1))} disabled={selected === TOTAL} aria-label="Palier suivant">›</button>
        </div>
        {(["free", "premium"] as const).map((track) => {
          const cell = row[track];
          return (
            <div key={track} className={`sillon-reward ${track} ${cell.state} kind-${cell.kind}`}>
              <span className="sillon-track">{track === "free" ? <><DiscIcon />Gratuit</> : <><CrownIcon />Premium</>}</span>
              <span className="sillon-pack"><i aria-hidden="true" />{cell.label || KIND_NAMES[cell.kind]}</span>
              {cell.state === "ready" && (
                <form action={claimPassTierAction}>
                  <input type="hidden" name="tier" value={row.tier} />
                  <input type="hidden" name="track" value={track} />
                  <button type="submit" className="btn gold">Prendre</button>
                </form>
              )}
              {cell.state === "claimed" && <span className="sillon-state ok"><CheckIcon />Pris</span>}
              {cell.state === "locked" && <span className="sillon-state lock"><LockIcon />Premium</span>}
            </div>
          );
        })}
      </section>
    </div>
  );
}
