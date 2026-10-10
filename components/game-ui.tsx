// Petits éléments d'interface partagés par les pages du jeu (rendus côté serveur ou client)
import type { CSSProperties } from "react";
import type { RarityTier } from "@/lib/rarity";

const AVATAR_HUES = [12, 160, 210, 280, 330, 40, 190, 100];

// Couleur d'avatar stable pour un pseudo donné
export function avatarBackground(name: string) {
  const hue = AVATAR_HUES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_HUES.length];
  return `linear-gradient(135deg, hsl(${hue} 80% 62%), hsl(${(hue + 50) % 360} 65% 45%))`;
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`avatar ${className}`} style={{ "--av": avatarBackground(name) } as CSSProperties} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Price({ value }: { value: number | string }) {
  return (
    <span className="price">
      <i className="coin-i" aria-hidden="true" />
      {Number(value).toLocaleString("fr-FR")}
    </span>
  );
}

// Cover Art Archive sert chaque pochette en 250, 500 ou 1200 pixels : les grilles et vignettes
// prennent la petite version, bien plus rapide à charger que celle enregistrée (500).
export function smallCover(url: string | null) {
  return url ? url.replace(/-500\.jpg$/, "-250.jpg") : null;
}

// Vignette de pochette avec le contour de sa rareté
export function Thumb({ cover, tier, title }: { cover: string | null; tier: RarityTier; title: string }) {
  const src = smallCover(cover);
  return (
    <span className={`thumb tier-${tier}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- pochettes servies par Cover Art Archive */}
      {src && <img src={src} alt={`Pochette de ${title}`} loading="lazy" />}
    </span>
  );
}

export function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}
