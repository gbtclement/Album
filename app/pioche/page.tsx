import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { CoverImage } from "@/components/cover-image";
import { SiteNav } from "@/components/site-nav";
import { getTodayDraw, isDrawReplayEnabled } from "@/lib/daily-draw";
import { DRAW_ATTEMPTS, DRAW_RATES, DRAW_TIME_ZONE, STREAK_BONUS_EVERY } from "@/lib/daily-draw-rules";
import { RARITY_LABELS, RARITY_TIERS } from "@/lib/rarity";
import { newDrawAction } from "./actions";
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
  // Rareté gardée secrète jusqu'à la réponse : une pioche « commune » donnerait moins envie de jouer
  const tierStyle = { "--rar": draw.answered ? `var(--r-${draw.tier})` : "var(--gold)" } as CSSProperties;
  const toBonus = STREAK_BONUS_EVERY - (draw.streak % STREAK_BONUS_EVERY);
  const replay = isDrawReplayEnabled();
  const wrongCount = draw.wrongGuesses.length;

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page narrow">
        <h1>Pioche du jour</h1>
        <p className="sub">
          Un album rien que pour toi, un morceau de pochette, {DRAW_ATTEMPTS} essais : l&apos;image s&apos;élargit à chaque erreur.
        </p>

        <section className={`draw${draw.answered ? ` tier-${draw.tier}${draw.solved ? " won" : " lost"}` : ""}`} style={tierStyle}>
          {draw.answered && <span className="tier-tag draw-tier">Pioche {RARITY_LABELS[draw.tier].toLowerCase()}</span>}
          <div className="draw-art">
            {draw.album ? (
              <CoverImage src={draw.album.coverUrl} title={draw.album.title} alt={`Pochette de ${draw.album.title}`} sizes="(min-width: 720px) 320px, 80vw" priority />
            ) : (
              // L'adresse change à chaque erreur : le navigateur recharge le morceau élargi au lieu de garder l'ancien
              // eslint-disable-next-line @next/next/no-img-element -- image propre au joueur, déjà découpée et optimisée par le serveur
              <img key={wrongCount} src={`/pioche/image?jour=${draw.date}&tour=${draw.round}&essai=${wrongCount}`} alt="Morceau de la pochette à deviner" width={480} height={480} />
            )}
          </div>

          {/* Essais : un point par essai, barré quand il est raté ; les mauvaises réponses restent affichées */}
          <div className="draw-tries" aria-label={draw.answered ? undefined : `${draw.attemptsLeft} essai${draw.attemptsLeft > 1 ? "s" : ""} restant${draw.attemptsLeft > 1 ? "s" : ""}`}>
            {Array.from({ length: DRAW_ATTEMPTS }, (_, index) => (
              <i key={index} className={index < wrongCount ? "miss" : draw.solved && index === wrongCount ? "hit" : ""} />
            ))}
          </div>
          {wrongCount > 0 && (
            <ul className="draw-misses" aria-label="Mauvaises réponses">
              {draw.wrongGuesses.map((title, index) => <li key={index}>{title}</li>)}
            </ul>
          )}

          {draw.album ? (
            <div className="draw-result">
              <strong className="draw-verdict">{draw.solved ? "Trouvé !" : "Raté…"}</strong>
              <p>
                C&apos;était <Link href={`/album/${draw.album.slug}`}>{draw.album.title}</Link> de {draw.album.artist}.
                {draw.solved
                  ? ` L'album est dans ta collection${wrongCount > 0 ? ` (trouvé au ${wrongCount + 1}e essai)` : ""}.`
                  : ""}
              </p>
              {replay ? (
                <form action={newDrawAction} className="draw-replay">
                  <button type="submit" className="btn gold">Nouvelle pioche</button>
                  <small>Mode test (DRAW_REPLAY=1) : pioches illimitées, en développement seulement</small>
                </form>
              ) : (
                <p className="draw-next">Nouvelle pioche dans {nextDrawIn()}</p>
              )}
            </div>
          ) : (
            <GuessForm key={wrongCount} attemptsLeft={draw.attemptsLeft} />
          )}
        </section>

        {/* Série et chances centrées sous la pioche, comme les chances sous le pack */}
        <div className="draw-info">
          <h2 className="label">Série <span>{draw.streak > 0 ? `${draw.streak} jour${draw.streak > 1 ? "s" : ""} d'affilée` : "aucune en cours"}</span></h2>
          <div className="streak" aria-label={`Encore ${toBonus} bonne${toBonus > 1 ? "s" : ""} réponse${toBonus > 1 ? "s" : ""} pour un pack Épique offert`}>
            {Array.from({ length: STREAK_BONUS_EVERY }, (_, index) => (
              <i key={index} className={index < draw.streak % STREAK_BONUS_EVERY || (draw.streak > 0 && draw.streak % STREAK_BONUS_EVERY === 0) ? "on" : ""} />
            ))}
          </div>
          <p className="streak-note">{STREAK_BONUS_EVERY} d&apos;affilée = 1 pack Épique offert</p>

          <div className="rates">
            <h2 className="label">Chances de la pioche</h2>
            {[...RARITY_TIERS].reverse().map((tier) => (
              <div key={tier} className={`rate tier-${tier}`}>
                <span><i />{RARITY_LABELS[tier]}</span>
                <b>{(DRAW_RATES[tier] * 100).toLocaleString("fr-FR")} %</b>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
