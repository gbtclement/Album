import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { legalInfo, MIN_AGE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: "Les règles du jeu Album : compte, pièces et cartes virtuelles, échanges, comportement et responsabilités.",
  alternates: { canonical: "/cgu" },
};

export default function CguPage() {
  const { publisher, contactEmail } = legalInfo();

  return (
    <LegalPage title="Conditions générales d'utilisation">
      <p>
        Ces conditions fixent les règles d&apos;utilisation d&apos;Album, jeu gratuit de collection de cartes d&apos;albums de musique édité par{" "}
        {publisher}. En créant un compte, tu les acceptes.
      </p>

      <h2>1. Ton compte</h2>
      <ul>
        <li>Il faut avoir au moins {MIN_AGE} ans, ou l&apos;accord d&apos;un parent.</li>
        <li>Un seul compte par personne. Donne une adresse e-mail qui t&apos;appartient.</li>
        <li>Choisis un pseudo correct : pas d&apos;insulte, de propos haineux, ni le nom d&apos;une autre personne.</li>
        <li>Garde ton mot de passe pour toi : tout ce qui est fait depuis ton compte est sous ta responsabilité.</li>
      </ul>

      <h2>2. Pièces et cartes</h2>
      <p>
        Les pièces et les cartes sont <strong>virtuelles</strong>. Elles n&apos;ont aucune valeur en argent : elles ne s&apos;achètent pas,
        ne se remboursent pas et ne s&apos;échangent pas contre de l&apos;argent réel, ni dans le jeu ni en dehors. Elles ne servent qu&apos;à jouer.
      </p>
      <p>
        Le marché garde 5 % du prix de chaque vente contre des pièces : cette part disparaît du jeu, pour que les pièces gardent leur valeur.
        Les échanges directs entre joueurs ne sont pas taxés.
      </p>
      <p>
        Chaque mois, le classement saisonnier récompense les 20 premiers joueurs (pièces et packs), selon les points gagnés en
        ouvrant des packs pendant le mois. Un compte qui triche peut perdre sa place et ses récompenses.
      </p>
      <p>
        Le statut premium est un abonnement facultatif, avec le premier mois offert, régi par les{" "}
        <Link href="/cgv">conditions générales de vente</Link>. Il donne des avantages de jeu (stock de packs plus grand, ligne premium du
        Disque d&apos;Or (le passe du mois), une quête premium par jour, par semaine et par mois). L&apos;éditeur peut aussi l&apos;offrir, par exemple pour des
        tests ou des concours.
      </p>
      <p>
        Pour garder le jeu équilibré, les règles peuvent évoluer : rythme des packs, récompenses, prix, rareté des cartes (qui suit les écoutes
        réelles des albums). Ces changements ne donnent droit à aucune compensation.
      </p>

      <h2>3. Ce qui est interdit</h2>
      <ul>
        <li>Utiliser plusieurs comptes, notamment pour faire passer des cartes ou des pièces vers un autre compte.</li>
        <li>Jouer avec un robot, un script ou tout outil automatique.</li>
        <li>Profiter d&apos;un bug au lieu de le signaler.</li>
        <li>Vendre ou acheter des cartes, des pièces ou des comptes contre de l&apos;argent ou un autre bien.</li>
        <li>Essayer d&apos;accéder au compte d&apos;un autre joueur ou de perturber le fonctionnement du site.</li>
      </ul>
      <p>
        En cas de manquement, le compte peut être averti, remis à zéro en partie (pièces ou cartes obtenues de façon irrégulière), suspendu ou
        supprimé, selon la gravité.
      </p>

      <h2>4. Contenus musicaux</h2>
      <p>
        Les noms d&apos;albums et d&apos;artistes et les pochettes appartiennent à leurs ayants droit. Album n&apos;est lié à aucun artiste,
        label ou plateforme d&apos;écoute. Les nombres d&apos;écoutes viennent de services publics (ListenBrainz, Last.fm) et sont donnés à titre
        indicatif. Plus de détails dans les <Link href="/mentions-legales">mentions légales</Link>.
      </p>

      <h2>5. Disponibilité du jeu</h2>
      <p>
        Le jeu est fourni gratuitement et en l&apos;état. Il peut être interrompu pour maintenance, modifié, ou fermé. En cas de fermeture
        définitive, les joueurs seront prévenus au moins 30 jours avant. Aucun service gratuit ne pouvant être garanti sans faille,
        l&apos;éditeur ne peut être tenu responsable d&apos;une perte de progression due à une panne.
      </p>

      <h2>6. Fin du compte</h2>
      <p>
        Tu peux supprimer ton compte à tout moment depuis ton <Link href="/profil">profil</Link> : ta collection et tes pièces sont alors
        effacées définitivement. Un compte sans visite pendant longtemps est aussi supprimé (voir la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>).
      </p>

      <h2>7. Données personnelles</h2>
      <p>
        Ce que le jeu enregistre et tes droits sont décrits dans la <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>8. Changements de ces conditions</h2>
      <p>
        Un changement important est annoncé dans le jeu avant de s&apos;appliquer. Continuer à jouer ensuite vaut acceptation ; si tu
        n&apos;es pas d&apos;accord, tu peux supprimer ton compte.
      </p>

      <h2>9. Droit applicable et contact</h2>
      <p>
        Ces conditions sont soumises au droit français. Pour toute question ou réclamation : <strong>{contactEmail}</strong>. Nous cherchons
        toujours une solution à l&apos;amiable avant tout recours.
      </p>
    </LegalPage>
  );
}
