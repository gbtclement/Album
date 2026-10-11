import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth, signOut } from "@/auth";
import { AchievementBadges } from "@/components/achievement-badges";
import { CoverImage } from "@/components/cover-image";
import { Avatar, smallCover } from "@/components/game-ui";
import { LegalLinks } from "@/components/legal-links";
import { SiteNav } from "@/components/site-nav";
import { getAchievements, syncAchievements } from "@/lib/achievements";
import { collectionScore, getCollectionCards } from "@/lib/collection";
import { db } from "@/lib/db";
import { MAX_STOCK, MAX_STOCK_PREMIUM } from "@/lib/pack-rules";
import { RARITY_LABELS, RARITY_TIERS } from "@/lib/rarity";
import { cancelPremiumAction, resendVerificationAction } from "./actions";
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

  // La barre d'infos vérifie aussi les succès, en parallèle : on le fait d'abord ici pour que
  // les pièces et la grille de succès de la page soient déjà à jour
  await syncAchievements(session.user.id);
  const [userResult, cards, achievements] = await Promise.all([
    db.query<{ email: string; pseudo: string; coins: number; auto_reveal: boolean; email_verified_at: Date | null; created_at: Date; premium_until: Date | null; trial_available: boolean }>(
      `select email, pseudo, coins, auto_reveal, email_verified_at, created_at, premium_trial_used_at is null as trial_available,
              case when premium_until > now() then premium_until end as premium_until
       from users where id = $1`,
      [session.user.id],
    ),
    getCollectionCards(session.user.id),
    getAchievements(session.user.id),
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
            {user.premium_until ? (
              <p className="premium-tag">Premium jusqu&apos;au {user.premium_until.toLocaleDateString("fr-FR")} · stock de {MAX_STOCK_PREMIUM} packs</p>
            ) : (
              <Link href="/premium" className="premium-tag">Passer premium</Link>
            )}
            {/* Simple raccourci : l'admin revérifie le rôle en base à chaque page */}
            {session.user.role === "admin" && <Link href="/admin" className="premium-tag admin-tag">Espace admin</Link>}
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
            <h2 className="label">Vitrine</h2>
            <div className="cards">
              {showcase.map((card) => (
                <Link key={card.slug} href={`/album/${card.slug}`} className={`card tier-${card.rarity_tier}`}>
                  <span className="cover">
                    <CoverImage src={smallCover(card.cover_url)} fallback={card.cover_url} title={card.title} lazy />
                  </span>
                  <span className="t">{card.title}</span>
                  <span className="a">{RARITY_LABELS[card.rarity_tier]}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <h2 className="label">Par rareté</h2>
        <div className="breakdown">
          {byTier.map(({ tier, count }) => (
            <div key={tier} className={`bd-row tier-${tier}`}>
              <span className="tier-tag">{RARITY_LABELS[tier]}</span>
              <div className="bar"><div style={{ width: `${(count / maxTier) * 100}%`, "--c": "var(--rar)" } as CSSProperties} /></div>
              <b>{count}</b>
            </div>
          ))}
        </div>

        <h2 className="label">Succès <span>{achievements.filter((item) => item.unlockedAt).length} / {achievements.length}</span></h2>
        <AchievementBadges items={achievements} />

        <h2 className="label">Réglages du jeu</h2>
        <div className="item">
          <div className="l">
            <strong>Révéler automatiquement</strong>
            <small>Retourne les cartes d&apos;un pack une à une, sans toucher</small>
          </div>
          <AutoRevealSwitch initial={user.auto_reveal} />
        </div>

        <h2 className="label">Mon abonnement</h2>
        {user.premium_until ? (
          <div className="sub-card">
            <div className="sub-head">
              <div>
                <strong>Premium actif</strong>
                <small>Jusqu&apos;au {user.premium_until.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</small>
              </div>
              <Link href="/premium" className="btn">Voir l&apos;offre</Link>
            </div>
            <details className="sub-cancel">
              <summary>Résilier mon premium</summary>
              <div className="sub-cancel-body">
                <p>La résiliation prend effet <strong>tout de suite</strong>, même s&apos;il reste des jours. Tu perds immédiatement :</p>
                <ul>
                  <li>le stock de {MAX_STOCK_PREMIUM} packs (retour à {MAX_STOCK} ; les packs déjà en stock restent) ;</li>
                  <li>la ligne premium du Disque d&apos;Or (le passe du mois) ;</li>
                  <li>les quêtes premium, même terminées et pas encore réclamées.</li>
                </ul>
                <p>Tes cartes, tes pièces et les packs déjà gagnés restent à toi.</p>
                <form action={cancelPremiumAction} className="sub-cancel-form">
                  <label className="radio">
                    <input type="checkbox" name="confirm" required /> Je comprends que je perds mes avantages premium maintenant
                  </label>
                  <button type="submit" className="btn red">Résilier maintenant</button>
                </form>
              </div>
            </details>
          </div>
        ) : (
          <div className="item">
            <div className="l">
              <strong>Compte gratuit</strong>
              <small>Premium : plus de packs, quêtes et passe en plus.{user.trial_available ? " 1er mois offert." : ""}</small>
            </div>
            <Link href="/premium" className="btn gold">Découvrir</Link>
          </div>
        )}

        <h2 className="label">Compte</h2>
        <div className="stack">
          {!user.email_verified_at && (
            <div className="notice">
              <p style={{ margin: 0 }}>
                Ton adresse e-mail n&apos;est pas encore vérifiée : clique sur le lien reçu par e-mail. Tant qu&apos;elle ne l&apos;est pas, tu ne peux ni échanger ni vendre au marché.
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

        <h2 className="label">Mes données</h2>
        <div className="stack">
          <div className="item">
            <div className="l">
              <strong>Télécharger mes données</strong>
              <small>Compte, collection, échanges... dans un fichier JSON</small>
            </div>
            <a href="/profil/donnees" download className="btn">Télécharger</a>
          </div>
          <div className="item">
            <div className="l">
              <strong>Supprimer mon compte</strong>
              <small>Efface définitivement ton compte et ta collection</small>
            </div>
            <Link href="/profil/supprimer" className="btn red">Supprimer</Link>
          </div>
        </div>
        <LegalLinks />
      </main>
    </>
  );
}
