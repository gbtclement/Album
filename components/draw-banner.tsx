import Link from "next/link";
import type { CSSProperties } from "react";
import { SparkIcon } from "@/components/icons";

// Raccourci vers la pioche du jour, affiché sur les pages Quêtes et Packs
export function DrawBanner({ pending }: { pending: boolean }) {
  return (
    <Link href="/pioche" className="draw-banner">
      <span className="q-ico" style={{ "--c": "var(--gold)" } as CSSProperties}><SparkIcon /></span>
      <span className="l">
        <strong>Pioche du jour</strong>
        <small>{pending ? "Devine l'album à partir d'un morceau de pochette" : "Déjà jouée : reviens demain"}</small>
      </span>
      <span className={`btn${pending ? " gold" : ""}`}>{pending ? "Jouer" : "Voir"}</span>
    </Link>
  );
}
