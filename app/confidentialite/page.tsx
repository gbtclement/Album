import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { INACTIVE_YEARS, INACTIVITY_NOTICE_DAYS, legalInfo, MIN_AGE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Les données que le jeu Musicodex enregistre, pourquoi, combien de temps, et comment les télécharger ou les supprimer.",
  alternates: { canonical: "/confidentialite" },
};

export default function ConfidentialitePage() {
  const { publisher, contactEmail } = legalInfo();

  return (
    <LegalPage title="Politique de confidentialité">
      <p>
        En bref : Musicodex enregistre le strict nécessaire pour faire fonctionner ton compte et ta partie. Pas de publicité, pas de mesure
        d&apos;audience, aucune donnée vendue ou prêtée. Tu peux télécharger tes données et supprimer ton compte à tout moment depuis ton profil.
      </p>

      <h2>Qui est responsable de tes données</h2>
      <p>
        {publisher}, éditeur du jeu (voir les <Link href="/mentions-legales">mentions légales</Link>). Pour toute question :{" "}
        <strong>{contactEmail}</strong>.
      </p>

      <h2>Ce que le jeu enregistre</h2>
      <ul>
        <li>
          <strong>Ton compte</strong> : adresse e-mail, pseudo, date d&apos;inscription, date d&apos;acceptation des conditions et date de
          ta dernière visite. Ton mot de passe n&apos;est jamais enregistré tel quel, seulement une empreinte chiffrée qui ne permet pas de le retrouver.
        </li>
        <li>
          <strong>Ta partie</strong> : cartes, pièces, packs ouverts et gagnés, quêtes, Disque d&apos;Or (passe du mois : XP et paliers récupérés), points et place au classement saisonnier, succès, pioches du jour, amis, échanges et annonces du marché, et tes réglages.
        </li>
        <li>
          <strong>Statut premium</strong> : sa date de fin. Si tu t&apos;abonnes, le paiement est traité par Stripe : Musicodex ne reçoit jamais
          ton numéro de carte, seulement un identifiant client Stripe et l&apos;état de ton abonnement (essai, actif, résilié). Les preuves de
          paiement sont gardées 10 ans, comme l&apos;exige la loi pour les pièces comptables.
        </li>
        <li>
          <strong>Sécurité</strong> : ton adresse IP, gardée au plus une heure, pour bloquer les robots qui essaient beaucoup de mots de
          passe ou créent des comptes en masse.
        </li>
      </ul>
      <p>
        Le jeu ne te demande jamais ton nom, ton adresse ou ton téléphone. Il est gratuit ; seul l&apos;abonnement premium, facultatif, est
        payant, et ta carte est alors saisie chez Stripe, jamais sur Musicodex.
      </p>

      <h2>Pourquoi</h2>
      <ul>
        <li>Faire fonctionner le jeu que tu as choisi d&apos;utiliser (c&apos;est l&apos;exécution des conditions d&apos;utilisation).</li>
        <li>
          Protéger les comptes et le jeu contre la triche et les attaques (c&apos;est notre intérêt légitime). Un outil repère les
          comportements anormaux, par exemple des packs ouverts par un programme, pour qu&apos;un administrateur les examine : aucune
          sanction n&apos;est automatique.
        </li>
        <li>
          T&apos;envoyer les e-mails utiles à ton compte : confirmation de ton adresse, mot de passe oublié, avertissement avant la suppression
          d&apos;un compte inactif. Aucune lettre d&apos;information ni publicité.
        </li>
      </ul>

      <h2>Qui peut les voir</h2>
      <ul>
        <li>
          <strong>Les autres joueurs</strong> voient ton pseudo, ton score au classement, et ce que tu fais avec eux : demandes d&apos;amis,
          échanges, annonces du marché. Jamais ton adresse e-mail.
        </li>
        <li>
          <strong>Les administrateurs du jeu</strong>, uniquement pour t&apos;aider, corriger ton compte ou lutter contre la triche.
          Chacune de leurs actions sur un compte est inscrite dans un journal.
        </li>
        <li>
          <strong>Les prestataires techniques</strong> qui font tourner le site, uniquement pour ce service : l&apos;hébergeur (voir les mentions
          légales), le service d&apos;envoi d&apos;e-mails (Brevo) et Stripe pour le paiement si tu t&apos;abonnes.
        </li>
      </ul>
      <p>
        Les pochettes et les polices d&apos;écriture sont servies par le site lui-même : ton navigateur ne contacte aucun autre service
        pendant que tu joues. Les liens vers les plateformes d&apos;écoute t&apos;emmènent sur leurs sites, qui ont leurs propres règles.
      </p>

      <h2>Combien de temps</h2>
      <ul>
        <li>
          <strong>Ton compte et ta partie</strong> : tant que tu joues. Sans visite pendant {INACTIVE_YEARS} ans, ton compte est supprimé,
          après un e-mail de prévenance {INACTIVITY_NOTICE_DAYS} jours avant (il suffit de te reconnecter pour le garder).
        </li>
        <li>
          <strong>Si tu supprimes ton compte</strong> : tout est effacé immédiatement. Les copies de sauvegarde de la base disparaissent
          d&apos;elles-mêmes en 30 jours au plus.
        </li>
        <li><strong>Les liens envoyés par e-mail</strong> : jusqu&apos;à leur expiration (24 heures au plus).</li>
        <li><strong>Ton adresse IP</strong> : une heure au plus.</li>
        <li><strong>Le journal des actions des administrateurs</strong> : un an.</li>
        <li>
          Le prix des ventes passées au marché est gardé pour calculer la cote des albums, mais sans aucun lien avec le vendeur ni l&apos;acheteur.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Le site utilise uniquement les cookies nécessaires à la connexion : celui qui garde ta session ouverte et deux cookies de sécurité
        pendant la connexion. Ils sont indispensables et dispensés de consentement : il n&apos;y a donc pas de bandeau cookies. Aucun cookie
        publicitaire ni de mesure d&apos;audience.
      </p>

      <h2>Tes droits</h2>
      <p>Tu peux à tout moment :</p>
      <ul>
        <li>
          <strong>télécharger tes données</strong> (droit d&apos;accès et de portabilité) : <Link href="/profil">profil</Link>, rubrique
          « Mes données », bouton « Télécharger mes données » ;
        </li>
        <li>
          <strong>supprimer ton compte</strong> (droit à l&apos;effacement) : <Link href="/profil">profil</Link>, rubrique « Mes données »,
          « Supprimer mon compte » ;
        </li>
        <li>
          <strong>faire corriger une information, t&apos;opposer à un traitement ou demander sa limitation</strong> : écris à{" "}
          <strong>{contactEmail}</strong>. Nous répondons dans un délai d&apos;un mois.
        </li>
      </ul>
      <p>
        Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).
      </p>

      <h2>Âge minimum</h2>
      <p>
        Il faut avoir au moins {MIN_AGE} ans pour créer un compte. Avant {MIN_AGE} ans, un parent doit donner son accord et peut nous écrire
        pour faire supprimer le compte de son enfant.
      </p>

      <h2>Sécurité</h2>
      <p>
        Connexion chiffrée (HTTPS), mots de passe et liens envoyés par e-mail enregistrés uniquement sous forme d&apos;empreinte, nombre de
        tentatives de connexion limité. En cas de fuite de données présentant un risque pour toi, tu seras prévenu.
      </p>

      <h2>Changements</h2>
      <p>Si cette politique change de façon importante, un message te prévient dans le jeu. La date de mise à jour figure en haut de la page.</p>
    </LegalPage>
  );
}
