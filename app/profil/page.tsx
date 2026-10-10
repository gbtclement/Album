import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth, signOut } from "@/auth";
import { Avatar, smallCover } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { collectionScore, getCollectionCards } from "@/lib/collection";
import { db } from "@/lib/db";
import { RARITY_LABELS, RARITY_TIERS } from "@/lib/rarity";
import { resendVerificationAction } from "./actions";
import { AutoRevealSwitch } from "./auto-reveal-switch";

export const metadata: Metadata = { title: "Profil" };

type Props = {
  searchParams: Promise<{ message?: string }>;
};

// Page protégée : sans session, on renvoie vers la connexion
export default async function ProfilPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const { message } = await searchParams;

  const [userResult, cards] = await Promise.all([
    db.query<{ email: string; pseudo: string; coins: number; auto_reveal: boolean; email_verified_at: Date | null; created_at: Date }>(
      "select email, pseudo, coins, auto_reveal, email_verified_at, created_at from users where id = $1",
      [session.user.id],
    ),
    getCollectionCards(session.user.id),
  ]);
  const user = userResult.rows[0];
  if (!user) redirect("/connexion");

  const totalCards = cards.reduce((sum, card) => sum + card.count, 0);
  const byTier = [...RARITY_TIERS].reverse().map((tier) => ({
    tier,
    count: cards.filter((card) => card.rarity_tier === tier).reduce((sum, card) => sum + card.count, 0),
  }));
  const maxTier = Math.max(1, ...byTier.map((row) => row.count));
  const showcase = [...cards].sort((a, b) => RARITY_TIERS.indexOf(b.rarity_tier) - RARITY_TIERS.indexOf(a.rarity_tier)).slice(0, 3);
  const since = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(user.created_at);

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <div className="prof-head">
          <Avatar name={user.pseudo} />
          <div>
            <h1 style={{ margin: 0 }}>{user.pseudo}</h1>
            <p className="sub" style={{ margin: 0 }}>Collectionneur depuis {since}</p>
          </div>
        </div>

        <div className="stats">
          <div className="stat"><b>{totalCards.toLocaleString("fr-FR")}</b><small>Cartes</small></div>
          <div className="stat"><b>{cards.length.toLocaleString("fr-FR")}</b><small>Albums</small></div>
          <div className="stat"><b>{collectionScore(cards).toLocaleString("fr-FR")}</b><small>Score</small></div>
          <div className="stat"><b>{user.coins.toLocaleString("fr-FR")}</b><small>Pièces</small></div>
        </div>

        {showcase.length > 0 && (
          <>
            <div className="label">Vitrine</div>
            <div className="cards">
              {showcase.map((card) => (
                <Link key={card.slug} href={`/album/${card.slug}`} className={`card tier-${card.rarity_tier}`}>
                  <span className="cover">
                    {/* eslint-disable-next-line @next/next/no-img-element -- pochettes servies par Cover Art Archive */}
                    {card.cover_url && <img src={smallCover(card.cover_url)!} alt="" loading="lazy" />}
                  </span>
                  <span className="t">{card.title}</span>
                  <span className="a">{RARITY_LABELS[card.rarity_tier]}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="label">Par rareté</div>
        <div className="breakdown">
          {byTier.map(({ tier, count }) => (
            <div key={tier} className={`bd-row tier-${tier}`}>
              <span className="tier-tag">{RARITY_LABELS[tier]}</span>
              <div className="bar"><div style={{ width: `${(count / maxTier) * 100}%`, "--c": "var(--rar)" } as CSSProperties} /></div>
              <b>{count}</b>
            </div>
          ))}
        </div>

        <div className="label">Réglages du jeu</div>
        <div className="item">
          <div className="l">
            <strong>Révéler automatiquement</strong>
            <small>Retourne les cartes d&apos;un pack une à une, sans toucher</small>
          </div>
          <AutoRevealSwitch initial={user.auto_reveal} />
        </div>

        <div className="label">Compte</div>
        <div className="stack">
          {!user.email_verified_at && (
            <div className="notice">
              <p style={{ margin: 0 }}>
                Ton adresse e-mail n&apos;est pas encore vérifiée : clique sur le lien reçu par e-mail. Tant qu&apos;elle ne l&apos;est pas,
                une connexion Google avec cette adresse remplace ton mot de passe.
              </p>
              <form action={resendVerificationAction} style={{ marginTop: 8 }}>
                <button type="submit" className="btn-link">Renvoyer le lien</button>
              </form>
            </div>
          )}
          <div className="item">
            <div className="l">
              <strong>Adresse e-mail</strong>
              <small>{user.email} · {user.email_verified_at ? "vérifiée" : "non vérifiée"}</small>
            </div>
          </div>
          <div className="item">
            <div className="l">
              <strong>Se déconnecter</strong>
              <small>de cet appareil</small>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="btn red">Sortir</button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
