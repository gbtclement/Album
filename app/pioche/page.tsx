import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { CoverImage } from "@/components/cover-image";
import { SiteNav } from "@/components/site-nav";
import { getTodayDraw } from "@/lib/daily-draw";
import { DRAW_RATES, DRAW_TIME_ZONE, STREAK_BONUS_EVERY } from "@/lib/daily-draw-rules";
import { RARITY_LABELS, RARITY_TIERS } from "@/lib/rarity";
import { GuessForm } from "./guess-form";

export const metadata: Metadata = { title: "Pioche du jour" };

type Props = {
  searchParams: Promise<{ message?: string }>;
};

// Temps restant avant minuit, heure de Paris
function nextDrawIn(now = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: DRAW_TIME_ZONE, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const left = 24 * 60 - (hour * 60 + minute);
  return left >= 60 ? `${Math.floor(left / 60)} h ${String(left % 60).padStart(2, "0")}` : `${left} min`;
}

export default async function PiochePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const { message } = await searchParams;
  const draw = await getTodayDraw(session.user.id);
  const tierStyle = { "--rar": `var(--r-${draw.tier})` } as CSSProperties;
  const toBonus = STREAK_BONUS_EVERY - (draw.streak % STREAK_BONUS_EVERY);

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page narrow">
        <h1>Pioche du jour</h1>
        <p className="sub">Un album rien que pour toi, un morceau de pochette, une seule chance.</p>

        <section className={`draw tier-${draw.tier}${draw.answered ? (draw.solved ? " won" : " lost") : ""}`} style={tierStyle}>
          <span className="tier-tag draw-tier">Pioche {RARITY_LABELS[draw.tier].toLowerCase()}</span>
          <div className="draw-art">
            {draw.album ? (
              <CoverImage src={draw.album.coverUrl} title={draw.album.title} alt={`Pochette de ${draw.album.title}`} sizes="(min-width: 720px) 320px, 80vw" priority />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- image propre au joueur, déjà découpée et optimisée par le serveur
              <img src={`/pioche/image?jour=${draw.date}`} alt="Morceau de la pochette à deviner" width={480} height={480} />
            )}
          </div>

          {draw.album ? (
            <div className="draw-result">
              <strong className="draw-verdict">{draw.solved ? "Trouvé !" : "Raté…"}</strong>
              <p>
                C&apos;était <Link href={`/album/${draw.album.slug}`}>{draw.album.title}</Link> de {draw.album.artist}.
                {draw.solved ? " L'album est dans ta collection." : ` Ta réponse : ${draw.guessTitle}.`}
              </p>
              <p className="draw-next">Nouvelle pioche dans {nextDrawIn()}</p>
            </div>
          ) : (
            <GuessForm />
          )}
        </section>

        <h2 className="label">Série <span>{draw.streak > 0 ? `${draw.streak} jour${draw.streak > 1 ? "s" : ""} d'affilée` : "aucune en cours"}</span></h2>
        <div className="streak" aria-label={`Encore ${toBonus} bonne${toBonus > 1 ? "s" : ""} réponse${toBonus > 1 ? "s" : ""} pour un pack offert`}>
          {Array.from({ length: STREAK_BONUS_EVERY }, (_, index) => (
            <i key={index} className={index < draw.streak % STREAK_BONUS_EVERY || (draw.streak > 0 && draw.streak % STREAK_BONUS_EVERY === 0) ? "on" : ""} />
          ))}
          <span>{STREAK_BONUS_EVERY} d&apos;affilée = 1 pack offert</span>
        </div>

        <h2 className="label">Chances de la pioche</h2>
        <div className="rates">
          {[...RARITY_TIERS].reverse().map((tier) => (
            <div key={tier} className={`rate tier-${tier}`}>
              <span><i />{RARITY_LABELS[tier]}</span>
              <b>{(DRAW_RATES[tier] * 100).toLocaleString("fr-FR")} %</b>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
