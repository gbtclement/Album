import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CheckIcon, CrownIcon, DiscIcon, LockIcon } from "@/components/icons";
import { SiteNav } from "@/components/site-nav";
import { MAX_STOCK, MAX_STOCK_PREMIUM } from "@/lib/pack-rules";
import { passRewardLabel, passTrackTotal } from "@/lib/pass-rules";
import { formatEuros, PREMIUM_PRICE_CENTS } from "@/lib/premium-offer";
import { getPremiumUntil } from "@/lib/premium";

export const metadata: Metadata = { title: "Premium" };

// Page de l'offre premium (lot PAY1). Le paiement Stripe n'est pas encore branché : le bouton reste désactivé.
export default async function PremiumPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const premiumUntil = await getPremiumUntil(session.user.id);
  const free = passTrackTotal("free");
  const premium = passTrackTotal("premium");

  const perks = [
    {
      icon: <DiscIcon />,
      title: `Stock de ${MAX_STOCK_PREMIUM} packs`,
      text: `Au lieu de ${MAX_STOCK}. Toujours un pack toutes les 5 minutes, mais tu en perds moins quand tu t'absentes.`,
    },
    {
      icon: <CrownIcon />,
      title: "Ligne premium du passe",
      text: `Chaque saison : ${passRewardLabel(premium)}, en plus de la ligne gratuite.`,
    },
    {
      icon: <CheckIcon />,
      title: "Rien de perdu",
      text: "Devenu premium en cours de mois, tu récupères tout de suite les paliers premium déjà atteints.",
    },
  ];

  return (
    <>
      <SiteNav />
      <main className="game-page narrow">
        <section className="prem-hero">
          <span className="prem-badge"><CrownIcon /></span>
          <h1>Album Premium</h1>
          <p className="sub">Plus de packs à ouvrir, une deuxième ligne de récompenses dans le passe.</p>

          {premiumUntil ? (
            <div className="prem-offer active">
              <p className="premium-tag">Premium actif</p>
              <p className="prem-until">Jusqu&apos;au <strong>{premiumUntil.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</strong></p>
              <Link href="/passe" className="btn gold lg">Voir mon passe</Link>
            </div>
          ) : (
            <div className="prem-offer">
              <p className="prem-price">
                <b>{formatEuros(PREMIUM_PRICE_CENTS)}</b>
                <span>/ mois</span>
              </p>
              <p className="prem-terms">Sans engagement · résiliable à tout moment</p>
              <button type="button" className="btn gold lg" disabled>
                <LockIcon /> Paiement bientôt disponible
              </button>
              <p className="field-hint">Paiement sécurisé par Stripe : Album ne voit jamais ta carte bancaire.</p>
            </div>
          )}
        </section>

        <h2 className="label">Ce que tu gagnes</h2>
        <div className="prem-perks">
          {perks.map((perk) => (
            <div key={perk.title} className="prem-perk">
              <span className="prem-perk-i">{perk.icon}</span>
              <div>
                <strong>{perk.title}</strong>
                <p>{perk.text}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="label">Gratuit ou premium</h2>
        <div className="prem-compare" role="table" aria-label="Comparaison gratuit et premium">
          <div className="prem-row head" role="row">
            <span role="columnheader"><span className="sr-only">Avantage</span></span>
            <span role="columnheader">Gratuit</span>
            <span role="columnheader" className="gold">Premium</span>
          </div>
          <div className="prem-row" role="row">
            <span role="rowheader">Stock de packs</span>
            <span role="cell">{MAX_STOCK}</span>
            <span role="cell" className="gold">{MAX_STOCK_PREMIUM}</span>
          </div>
          <div className="prem-row" role="row">
            <span role="rowheader">Passe de combat</span>
            <span role="cell">{passRewardLabel(free)}</span>
            <span role="cell" className="gold">+ {passRewardLabel(premium)}</span>
          </div>
          <div className="prem-row" role="row">
            <span role="rowheader">Pièces, marché, quêtes</span>
            <span role="cell">Identiques</span>
            <span role="cell">Identiques</span>
          </div>
        </div>
        <p className="sub prem-fair">
          Le premium ne vend ni pièces ni cartes : tout ce qu&apos;il donne s&apos;ouvre en packs, comme pour tout le monde. Le marché
          reste équitable.
        </p>
      </main>
    </>
  );
}
