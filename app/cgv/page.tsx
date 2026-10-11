import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { legalInfo } from "@/lib/legal";
import { MAX_STOCK, MAX_STOCK_PREMIUM } from "@/lib/pack-rules";
import { formatEuros, PREMIUM_PRICE_CENTS, PREMIUM_TRIAL_DAYS } from "@/lib/premium-offer";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: "L'abonnement premium d'Album : prix, mois offert, paiement, renouvellement, résiliation et rétractation.",
  alternates: { canonical: "/cgv" },
};

export default function CgvPage() {
  const { publisher, contactEmail, seller, mediator } = legalInfo();
  const price = formatEuros(PREMIUM_PRICE_CENTS);

  return (
    <LegalPage title="Conditions générales de vente">
      <p>
        Ces conditions s&apos;appliquent à la seule chose payante d&apos;Album : l&apos;<strong>abonnement premium</strong>. Le reste du jeu
        est gratuit et régi par les <Link href="/cgu">conditions générales d&apos;utilisation</Link>. En t&apos;abonnant, tu acceptes ces
        conditions.
      </p>

      <h2>1. Vendeur</h2>
      <p>
        {publisher}, {seller}. Contact : <strong>{contactEmail}</strong>.
      </p>

      <h2>2. Ce que comprend l&apos;abonnement</h2>
      <ul>
        <li>un stock de {MAX_STOCK_PREMIUM} packs au lieu de {MAX_STOCK} ;</li>
        <li>la ligne premium du passe de combat ;</li>
        <li>une quête premium par jour, par semaine et par mois.</li>
      </ul>
      <p>
        Le détail à jour est sur la <Link href="/premium">page premium</Link>. Ce sont des avantages de jeu, virtuels et sans valeur en argent
        (voir les CGU). L&apos;abonnement ne permet pas d&apos;acheter des pièces ni des cartes précises. Pour garder le jeu équilibré, le contenu
        des récompenses peut évoluer ; s&apos;il est réduit de façon importante, tu es prévenu et tu peux résilier.
      </p>

      <h2>3. Prix et premier mois offert</h2>
      <p>
        L&apos;abonnement coûte <strong>{price} par mois</strong>, toutes taxes comprises. Le <strong>premier mois ({PREMIUM_TRIAL_DAYS}{" "}
        jours) est offert</strong>, une seule fois par compte et par personne. Ta carte est demandée à l&apos;inscription, mais rien n&apos;est
        prélevé pendant le mois offert. Tu reçois un e-mail avant la fin du mois offert. Sans résiliation de ta part, le premier paiement de{" "}
        {price} a lieu le lendemain.
      </p>
      <p>
        Un changement de prix est annoncé par e-mail au moins 30 jours avant de s&apos;appliquer. Tu peux résilier avant, sans frais.
      </p>

      <h2>4. Paiement</h2>
      <p>
        Le paiement se fait par carte bancaire, via <strong>Stripe</strong>, prestataire de paiement agréé. Ta carte est saisie chez Stripe :
        Album ne voit jamais son numéro. L&apos;abonnement est prélevé chaque mois à la date anniversaire de la fin du mois offert. Un reçu est
        envoyé par e-mail à chaque paiement.
      </p>
      <p>
        Si un paiement échoue, Stripe essaie à nouveau pendant quelques jours. S&apos;il échoue toujours, l&apos;abonnement s&apos;arrête et
        le compte redevient gratuit. Tu ne perds rien de ta collection.
      </p>

      <h2>5. Durée et résiliation</h2>
      <p>
        L&apos;abonnement est <strong>sans engagement</strong> et se renouvelle chaque mois. Tu peux le résilier à tout moment, en quelques
        clics, depuis ton <Link href="/profil">profil</Link> (« Gérer mon abonnement »), ou en écrivant à {contactEmail}. La résiliation
        arrête les paiements suivants. Le premium reste actif jusqu&apos;à la fin du mois déjà payé (ou du mois offert), puis le compte
        redevient gratuit. Le mois en cours n&apos;est pas remboursé.
      </p>
      <p>
        Quand le premium s&apos;arrête, tu gardes tout ce que tu as déjà obtenu : cartes, packs gagnés, pièces. Seuls les avantages à venir
        s&apos;arrêtent.
      </p>

      <h2>6. Droit de rétractation</h2>
      <p>
        Tu disposes de 14 jours après ton inscription pour te rétracter, sans donner de raison. Comme ces 14 jours tombent pendant le mois
        offert, il suffit de résilier pendant ce délai : tu ne paies rien. Tu peux aussi nous écrire à {contactEmail}.
      </p>
      <p>
        Si tu t&apos;es déjà abonné une première fois, il n&apos;y a pas de nouveau mois offert. Dans ce cas, en demandant l&apos;accès
        immédiat au premium, tu acceptes qu&apos;il commence avant la fin du délai de 14 jours. Si tu te rétractes pendant ce délai, tu es
        remboursé du prix, moins la part correspondant aux jours déjà utilisés.
      </p>

      <h2>7. Mineurs</h2>
      <p>
        Si tu as moins de 18 ans, tu dois avoir l&apos;accord d&apos;un parent pour t&apos;abonner, et le moyen de paiement doit être utilisé
        avec son accord. Un parent peut nous écrire pour faire arrêter un abonnement souscrit sans son accord.
      </p>

      <h2>8. Suspension du compte</h2>
      <p>
        Si un compte est suspendu ou supprimé pour non-respect des CGU (triche, plusieurs comptes…), l&apos;abonnement s&apos;arrête aussi. Le
        mois en cours n&apos;est pas remboursé. Si tu supprimes toi-même ton compte, l&apos;abonnement est résilié en même temps.
      </p>

      <h2>9. Réclamations et médiation</h2>
      <p>
        Pour toute réclamation, écris à <strong>{contactEmail}</strong> : nous répondons sous 15 jours. Si aucune solution n&apos;est
        trouvée, tu peux faire appel gratuitement au médiateur de la consommation : {mediator}.
      </p>

      <h2>10. Droit applicable</h2>
      <p>Ces conditions sont soumises au droit français. Tu peux aussi saisir le tribunal de ton domicile.</p>
    </LegalPage>
  );
}
