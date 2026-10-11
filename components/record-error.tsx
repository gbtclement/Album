// Pages d'erreur du jeu (404 et plantage) : la pochette d'un album qui n'existe pas, le vinyle à moitié sorti
// avec le numéro de l'erreur sur l'étiquette, le bras de la platine levé. En dessous, un dos de pochette :
// les « pistes » sont les chemins pour repartir, la dernière (la page demandée) est grisée.
// Sans hook ni gestionnaire d'événement propre : utilisable par not-found.tsx (serveur) et error.tsx (client).
import Link from "next/link";
import type { ReactNode } from "react";
import { PlayIcon } from "@/components/icons";

export type RecordTrack = { title: string; duration: string; href?: string; onClick?: () => void };

type Props = {
  side: string;
  label: string;
  title: string;
  text: ReactNode;
  action: ReactNode;
  tracks: RecordTrack[];
  missing: string;
  scratched?: boolean;
  alert?: boolean;
};

export function RecordError({ side, label, title, text, action, tracks, missing, scratched = false, alert = false }: Props) {
  return (
    <main className="rec-page">
      <svg className={`rec-art${scratched ? " scratched" : ""}`} viewBox="0 0 360 230" aria-hidden="true">
        <g className="rec-disc">
          <circle cx="236" cy="115" r="86" className="rec-vinyl" />
          {[78, 70, 62, 54, 46].map((r) => (
            <circle key={r} cx="236" cy="115" r={r} className="rec-groove" />
          ))}
          <circle cx="236" cy="115" r="30" className="rec-label" />
          <text x="236" y="122" className="rec-code">{label}</text>
          <circle cx="236" cy="115" r="3" className="rec-hole" />
          {scratched && <path d="M180 62 L292 160" className="rec-scratch" />}
        </g>
        <g className="rec-sleeve">
          <rect x="16" y="20" width="180" height="190" rx="16" />
          <text x="34" y="46" className="rec-brand">MUSICODEX</text>
          <text x="106" y="148" className="rec-q">?</text>
        </g>
        <g className="rec-arm">
          <circle cx="344" cy="28" r="11" className="rec-pivot" />
          <path d="M344 28 L334 150 L322 168" className="rec-rod" />
          <rect x="310" y="164" width="18" height="12" rx="3" transform="rotate(30 319 170)" className="rec-head" />
        </g>
      </svg>

      <p className="rec-side">{side}</p>
      <h1 className="rec-title">{title}</h1>
      <p className="rec-text" role={alert ? "alert" : undefined}>{text}</p>
      <div className="rec-action">{action}</div>

      <ol className="rec-tracks" aria-label="Où aller maintenant">
        {tracks.map((track, index) => {
          const content = (
            <>
              <span className="rec-n">{String(index + 1).padStart(2, "0")}</span>
              <PlayIcon className="rec-play" />
              <span className="rec-t">{track.title}</span>
              <span className="rec-d">{track.duration}</span>
            </>
          );
          return (
            <li key={track.title}>
              {track.href ? (
                <Link href={track.href} className="rec-track">{content}</Link>
              ) : (
                <button type="button" onClick={track.onClick} className="rec-track">{content}</button>
              )}
            </li>
          );
        })}
        <li>
          <span className="rec-track missing" aria-label={`${missing} : introuvable`}>
            <span className="rec-n">{String(tracks.length + 1).padStart(2, "0")}</span>
            <span className="rec-play-off" aria-hidden="true" />
            <span className="rec-t">{missing}</span>
            <span className="rec-d">--:--</span>
          </span>
        </li>
      </ol>
    </main>
  );
}
