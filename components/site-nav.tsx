import Link from "next/link";
import { auth } from "@/auth";
import { Dock, PackTimer, Toast } from "@/components/game-nav";
import { Avatar, formatNumber } from "@/components/game-ui";
import { MAX_STOCK } from "@/lib/pack-rules";
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
          <span className="res" title="Pièces">
            <i className="coin" aria-hidden="true" />
            {formatNumber(hud.coins)}
          </span>
          <Link href="/packs" className="res" title="Packs disponibles">
            <i className="mini-vinyl" aria-hidden="true" />
            {hud.stock}/{MAX_STOCK}
            <PackTimer nextPackAt={hud.nextPackAt} />
          </Link>
        </div>
      </header>
      <Dock stock={hud.stock} nextPackAt={hud.nextPackAt} questsReady={hud.questsReady} social={hud.social} />
      <Toast key={message} message={message} />
    </>
  );
}
