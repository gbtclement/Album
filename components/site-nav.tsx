import Link from "next/link";
import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { Dock, PackTimer, Toast } from "@/components/game-nav";
import { Avatar, formatNumber } from "@/components/game-ui";
import { SparkIcon } from "@/components/icons";
import { getHudData } from "@/lib/hud";
import { PASS_TIERS, XP_PER_TIER } from "@/lib/pass-rules";
import { seasonName, seasonRewardLabel } from "@/lib/season-rules";

// Habillage commun des pages : barre d'infos en haut (profil, pièces, packs), barre de jeu en bas,
// et message de retour éventuel (?message=...). Un visiteur voit seulement Connexion et Inscription.
export async function SiteNav({ message }: { message?: string } = {}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <>
        <header className="hud">
          <Link href="/" className="player"><span className="avatar" aria-hidden="true">M</span><strong>Musicodex</strong></Link>
          <div className="guest-links">
            <Link href="/connexion" className="btn">Connexion</Link>
            <Link href="/inscription" className="btn gold">Inscription</Link>
          </div>
        </header>
        <Toast key={message} message={message} />
      </>
    );
  }

  const hud = await getHudData(session.user.id);
  const pseudo = session.user.pseudo;

  return (
    <>
      <header className="hud">
        <Link href="/profil" className="player" aria-label="Profil">
          <Avatar name={pseudo} />
          <span>
            <strong>{pseudo}</strong>
            <small>{formatNumber(hud.cards)} carte{hud.cards > 1 ? "s" : ""}</small>
          </span>
        </Link>
        {/* Disque d'Or (passe du mois), version ordinateur : barre horizontale centrée (sur mobile, la pastille ronde plus bas) */}
        <Link
          href="/passe"
          className="pass-strip"
          style={{ "--p": `${hud.passProgress}%` } as CSSProperties}
          aria-label={`Disque d'Or, niveau ${hud.passLevel}${hud.passReady > 0 ? `, ${hud.passReady} à réclamer` : ""}`}
        >
          <span className="pass-strip-level"><small>Niv.</small>{hud.passLevel}</span>
          <span className="pass-strip-main">
            <span className="pass-strip-top">
              <span>Disque d&apos;Or</span>
              <span>{hud.passLevel >= PASS_TIERS ? "Terminé" : `${formatNumber(hud.passTierXp)} / ${formatNumber(XP_PER_TIER)} XP`}</span>
            </span>
            <span className="pass-strip-bar"><i /></span>
          </span>
          {hud.passLevel < PASS_TIERS && <span className="pass-strip-next">{hud.passLevel + 1}</span>}
          {hud.passReady > 0 && <span className="pass-strip-ready">{hud.passReady} à prendre</span>}
        </Link>
        <div className="resources">
          {/* Raccourci vers la pioche du jour : il brille tant qu'elle n'est pas jouée */}
          <Link
            href="/pioche"
            className={`res draw-res${hud.drawPending ? " pending" : ""}`}
            title={hud.drawPending ? "Pioche du jour : à jouer" : "Pioche du jour : déjà jouée"}
            aria-label={hud.drawPending ? "Pioche du jour, à jouer" : "Pioche du jour, déjà jouée"}
          >
            <SparkIcon />
          </Link>
          {/* Disque d'Or : niveau, anneau de progression vers le palier suivant, pastille s'il y a à réclamer */}
          <Link
            href="/passe"
            className="res pass-res"
            style={{ "--p": `${hud.passProgress}%` } as CSSProperties}
            title={`Disque d'Or : niveau ${hud.passLevel}${hud.passReady > 0 ? `, ${hud.passReady} récompense(s) à réclamer` : ""}`}
            aria-label={`Disque d'Or, niveau ${hud.passLevel}${hud.passReady > 0 ? `, ${hud.passReady} à réclamer` : ""}`}
          >
            <span className="pass-ring"><b>{hud.passLevel}</b></span>
            {hud.passReady > 0 && <span className="pass-dot" aria-hidden="true" />}
          </Link>
          <span className="res" title="Pièces">
            <i className="coin" aria-hidden="true" />
            {formatNumber(hud.coins)}
          </span>
          <Link href="/packs" className="res" title="Packs disponibles">
            <i className="mini-vinyl" aria-hidden="true" />
            {hud.stock}/{hud.max}
            {hud.extraPacks > 0 && <span className="res-extra" title="Packs gagnés">+{hud.extraPacks}</span>}
            <PackTimer nextPackAt={hud.nextPackAt} />
          </Link>
        </div>
      </header>
      <Dock stock={hud.stock} extra={hud.extraPacks} nextPackAt={hud.nextPackAt} questsReady={hud.questsReady} social={hud.social} collection={hud.setsReady} market={hud.wishesOnSale} />
      <Toast key={message} message={message} />
      {/* Fin de mois : un seul message pour le passe (paliers versés) et le classement saisonnier (top 20) */}
      {(hud.seasonRewards > 0 || hud.seasonAward) && (
        <Toast
          key={`fin-de-saison-${hud.seasonAward?.season ?? ""}-${hud.seasonRewards}`}
          message={[
            hud.seasonAward &&
              `${seasonName(hud.seasonAward.season)} terminée : tu finis ${hud.seasonAward.rank === 1 ? "1er" : `${hud.seasonAward.rank}e`} du classement ! ${seasonRewardLabel(hud.seasonAward.reward)}.`,
            hud.seasonRewards > 0 &&
              `Disque d'Or : ${hud.seasonRewards} récompense${hud.seasonRewards > 1 ? "s" : ""} ajoutée${hud.seasonRewards > 1 ? "s" : ""} à tes packs.`,
          ].filter(Boolean).join(" ")}
          variant="achievement"
        />
      )}
      {hud.unlocked.length > 0 && (
        <Toast
          key={hud.unlocked.map((item) => item.key).join()}
          message={`Succès débloqué : ${hud.unlocked.map((item) => item.title).join(", ")} · +${formatNumber(hud.unlocked.reduce((sum, item) => sum + item.reward, 0))} pièces`}
          variant="achievement"
        />
      )}
    </>
  );
}
