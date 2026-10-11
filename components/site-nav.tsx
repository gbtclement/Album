import Link from "next/link";
import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { Dock, PackTimer, Toast } from "@/components/game-nav";
import { Avatar, formatNumber } from "@/components/game-ui";
import { SparkIcon } from "@/components/icons";
import { getHudData } from "@/lib/hud";

// Habillage commun des pages : barre d'infos en haut (profil, pièces, packs), barre de jeu en bas,
// et message de retour éventuel (?message=...). Un visiteur voit seulement Connexion et Inscription.
export async function SiteNav({ message }: { message?: string } = {}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <>
        <header className="hud">
          <Link href="/" className="player"><span className="avatar" aria-hidden="true">A</span><strong>Album</strong></Link>
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
          {/* Passe de combat : niveau, anneau de progression vers le palier suivant, pastille s'il y a à réclamer */}
          <Link
            href="/passe"
            className="res pass-res"
            style={{ "--p": `${hud.passProgress}%` } as CSSProperties}
            title={`Passe de combat : niveau ${hud.passLevel}${hud.passReady > 0 ? `, ${hud.passReady} récompense(s) à réclamer` : ""}`}
            aria-label={`Passe de combat, niveau ${hud.passLevel}${hud.passReady > 0 ? `, ${hud.passReady} à réclamer` : ""}`}
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
      <Dock stock={hud.stock} extra={hud.extraPacks} nextPackAt={hud.nextPackAt} questsReady={hud.questsReady} social={hud.social} collection={hud.setsReady} />
      <Toast key={message} message={message} />
      {hud.seasonRewards > 0 && (
        <Toast
          key={`saison-${hud.seasonRewards}`}
          message={`Saison du passe terminée : ${hud.seasonRewards} récompense${hud.seasonRewards > 1 ? "s" : ""} ajoutée${hud.seasonRewards > 1 ? "s" : ""} à tes packs`}
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
