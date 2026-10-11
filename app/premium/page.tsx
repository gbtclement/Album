import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LockIcon } from "@/components/icons";
import { SiteNav } from "@/components/site-nav";
import { MAX_STOCK, MAX_STOCK_PREMIUM, rewardLabel } from "@/lib/pack-rules";
import { passRewardLabel, passTrackTotal } from "@/lib/pass-rules";
import { formatEuros, PREMIUM_PRICE_CENTS } from "@/lib/premium-offer";
import { getPremiumUntil } from "@/lib/premium";
import { QUESTS, type Period } from "@/lib/quests";

export const metadata: Metadata = { title: "Premium" };

const PERIOD_NAMES: Record<Period, string> = { daily: "du jour", weekly: "de la semaine", monthly: "du mois" };

// Page de l'offre premium, présentée comme l'édition deluxe d'un album : pochette, autocollant de prix, liste des titres.
// Le paiement Stripe n'est pas encore branché : le bouton reste désactivé.
export default async function PremiumPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const premiumUntil = await getPremiumUntil(session.user.id);
  const price = formatEuros(PREMIUM_PRICE_CENTS);

  const tracks = [
    { title: "Stock de packs", detail: "Toujours un pack toutes les 5 minutes, mais tu en gardes plus en réserve", value: `${MAX_STOCK_PREMIUM} au lieu de ${MAX_STOCK}` },
    ...QUESTS.filter((quest) => quest.premium).map((quest) => ({
      title: `Quête premium ${PERIOD_NAMES[quest.period]}`,
      detail: quest.title,
      value: rewardLabel(quest.reward),
    })),
    { title: "Ligne premium du passe", detail: "30 paliers en plus chaque saison, à côté de la ligne gratuite", value: passRewardLabel(passTrackTotal("premium")) },
    { title: "Rien de perdu", detail: "Devenu premium en cours de mois, tu récupères les paliers déjà atteints", value: "Rattrapage" },
  ];

  return (
    <>
      <SiteNav />
      <main className="game-page dlx">
        <section className="dlx-hero">
          <div className="dlx-cover" aria-hidden="true">
            <span className="dlx-disc" />
            <div className="dlx-sleeve">
              <span className="dlx-brand">Album</span>
              <span className="dlx-name">Édition<br />Deluxe</span>
              <span className="dlx-ref">PRM · {tracks.length} titres</span>
            </div>
            <span className="dlx-sticker">
              {premiumUntil ? <b>Actif</b> : <><b>{price}</b><small>par mois</small></>}
            </span>
          </div>

          <div className="dlx-intro">
            <p className="dlx-eyebrow">Premium</p>
            <h1>La même partie, en édition deluxe.</h1>
            <p className="dlx-lead">Plus de packs à ouvrir chaque jour. Pas de cartes à acheter : tout s&apos;ouvre en packs, comme pour tout le monde.</p>
            {premiumUntil ? (
              <div className="dlx-cta">
                <p className="dlx-status">Ton premium court jusqu&apos;au <strong>{premiumUntil.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</strong>.</p>
                <Link href="/quetes" className="btn gold lg">Mes quêtes premium</Link>
              </div>
            ) : (
              <div className="dlx-cta">
                <button type="button" className="btn gold lg" disabled>
                  <LockIcon /> Bientôt disponible
                </button>
                <p className="dlx-fine">{price} par mois, sans engagement. Paiement par Stripe : Album ne voit jamais ta carte.</p>
              </div>
            )}
          </div>
        </section>

        <section className="dlx-side" aria-labelledby="dlx-tracks">
          <h2 id="dlx-tracks" className="dlx-side-title"><span>Face A</span> Ce que ça change</h2>
          <ol className="dlx-tracks">
            {tracks.map((track, index) => (
              <li key={track.title}>
                <span className="dlx-no">{String(index + 1).padStart(2, "0")}</span>
                <span className="dlx-track">
                  <strong>{track.title}</strong>
                  <small>{track.detail}</small>
                </span>
                <span className="dlx-val">{track.value}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="dlx-side b" aria-labelledby="dlx-same">
          <h2 id="dlx-same" className="dlx-side-title"><span>Face B</span> Ce qui ne change pas</h2>
          <p className="dlx-notes">
            Le marché, les échanges, la pioche du jour et les quêtes classiques sont les mêmes pour tout le monde. Les chances aussi :
            un même pack tire ses cartes de la même façon, que tu sois premium ou non.
          </p>
        </section>
      </main>
    </>
  );
}
