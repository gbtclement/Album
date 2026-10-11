import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Documentation technique",
  description: "Documentation technique du site Musicodex : stack, routes, base de données, règles du jeu et avancement.",
  alternates: { canonical: "/documentation" },
};

// Documentation technique du site. À mettre à jour à chaque lot.
// Route publique pour l'instant (pas de protection).

const ROUTES = [
  { path: "/", description: "Accueil (un joueur connecté est envoyé vers sa collection)" },
  { path: "/connexion", description: "Connexion (e-mail et mot de passe)" },
  { path: "/inscription", description: "Création de compte (pseudo, e-mail, mot de passe et sa confirmation)" },
  { path: "/mot-de-passe-oublie", description: "Demande d'un lien pour choisir un nouveau mot de passe (même réponse que l'adresse soit inscrite ou non)" },
  { path: "/nouveau-mot-de-passe", description: "Choix du nouveau mot de passe depuis le lien reçu (?token=, usage unique, valable 1 h)" },
  { path: "/apercu-emails/[modele]", description: "Aperçu des e-mails dans le navigateur (verification, mot-de-passe), en développement seulement" },
  { path: "/profil", description: "Profil : statistiques, vitrine, répartition par rareté, succès (badges débloqués et progression), réglages du jeu, compte (protégée)" },
  { path: "/packs", description: "Ouverture d'un pack ou de tous les packs, animation de révélation, chances par rareté (protégée)" },
  { path: "/collection", description: "Cartes possédées uniquement, recherche, filtre de rareté, fiche qui glisse depuis le bas ; onglet Artistes (?vue=artistes) : collections d'artiste commencées, progression et récompenses (protégée)" },
  { path: "/amis", description: "Demandes d'amis, liste d'amis (protégée)" },
  { path: "/echanges", description: "Propositions reçues, envoyées et historique (protégée)" },
  { path: "/echanges/nouveau", description: "Création d'une proposition d'échange avec un ami (protégée)" },
  { path: "/marche", description: "Annonces actives : achat en pièces ou troc contre un album (protégée)" },
  { path: "/marche/vendre", description: "Mise en vente d'un album, contre des pièces ou un autre album (protégée)" },
  { path: "/bourse", description: "Indice du marché et cotes de tous les albums vendus sur 30 jours (mini-courbes, recherche, graphique par album) (protégée)" },
  { path: "/api/market/history", description: "Historique des prix : ?album=<slug> et ?jours=<n> (30 par défaut, 365 max)" },
  { path: "/classement", description: "Podium et top 100 par score de rareté, onglet Amis (?vue=amis), onglet Saison (?vue=saison : points du mois, barème du top 20), position du joueur connecté (protégée)" },
  { path: "/quetes", description: "Quêtes journalières, hebdomadaires et mensuelles, avec récupération des récompenses (protégée)" },
  { path: "/premium", description: "Offre premium présentée comme l'édition deluxe d'un album : pochette avec autocollant de prix, avantages en liste de titres (Face A), ce qui ne change pas (Face B), date de fin si déjà premium ; paiement Stripe à venir (protégée)" },
  { path: "/passe", description: "Disque d'Or (ancien « passe de combat ») : les 30 paliers posés sur le sillon d'un vinyle (spirale du bord vers l'étiquette), trait doré de l'XP, bras de platine sur la position actuelle ; toucher un palier affiche ses récompenses gratuite et premium avec « Prendre » ; « Tout prendre » (protégée, app/passe/pass-vinyl.tsx)" },
  { path: "/passe/liste", description: "Ancienne vue du Disque d'Or en colonnes défilantes, gardée en secours (protégée)" },
  { path: "/pioche", description: "Pioche du jour : un morceau de pochette à deviner, une seule réponse par jour, série de bonnes réponses (protégée)" },
  { path: "/pioche/image", description: "Morceau de la pochette du jour, découpé par le serveur (jamais l'image entière avant la réponse)" },
  { path: "/pioche/recherche", description: "Suggestions de titres pour la pioche : ?q=<texte> (2 caractères minimum)" },
  { path: "/album/[slug]", description: "Fiche d'un album : pochette, rareté, liens d'écoute" },
  { path: "/verifier-email", description: "Validation de l'adresse e-mail depuis le lien reçu (lien à usage unique, valable 24 h)" },
  { path: "/profil/donnees", description: "Téléchargement de toutes les données du joueur en JSON (RGPD, protégée)" },
  { path: "/profil/supprimer", description: "Suppression définitive du compte, confirmée par le pseudo et le mot de passe (RGPD, protégée)" },
  { path: "/mentions-legales, /confidentialite, /cgu, /cgv", description: "Pages légales : éditeur et hébergeur, politique de confidentialité, conditions d'utilisation, conditions de vente de l'abonnement premium (prix, mois offert, résiliation, rétractation, médiation)" },
  { path: "/documentation", description: "Cette page" },
  { path: "/sitemap.xml", description: "Plan du site : pages publiques et fiches d'albums (SEO)" },
  { path: "/robots.txt", description: "Règles pour les robots d'indexation (bloqué tant que SEO_INDEXING n'est pas true)" },
  { path: "/manifest.webmanifest", description: "Manifeste (nom, couleurs, icônes) pour l'ajout à l'écran d'accueil" },
  { path: "/opengraph-image", description: "Image d'aperçu générée pour le partage de liens" },
  { path: "/api/health", description: "État de l'application, de PostgreSQL et de Redis" },
  { path: "/api/auth/*", description: "Routes Auth.js (connexion, déconnexion, callbacks)" },
];

const TABLES = [
  { name: "users", description: "Joueurs : e-mail, pseudo, hash du mot de passe, pièces (coins), date de vérification de l'e-mail, version des sessions, réglage auto_reveal (cartes retournées automatiquement), dates d'acceptation des CGU, de dernière visite et d'avertissement d'inactivité, fin du premium (premium_until, null si jamais premium), date du premier premium (premium_trial_used_at : rempli = plus de mois offert)" },
  { name: "email_verifications", description: "Lien de vérification en cours par joueur (empreinte SHA-256 du jeton, date d'expiration)" },
  { name: "password_resets", description: "Lien de réinitialisation du mot de passe en cours par joueur (empreinte SHA-256 du jeton, expiration 1 h)" },
  { name: "schema_migrations", description: "Migrations déjà appliquées (nom du fichier et date), tenue par scripts/migrate.mjs" },
  { name: "albums", description: "Catalogue : identifiant MusicBrainz, titre, artiste, pochette, écoutes et auditeurs ListenBrainz, palier de rareté, liens d'écoute" },
  { name: "pack_stocks", description: "Stock de packs par joueur et date de la dernière recharge, plus les packs gagnés : bonus_packs (classiques), solo_packs (1 album), epic_packs et legendary_packs, sans maximum. Le stock est limité à 15 en base ; le maximum de chaque joueur (10, 15 en premium) est appliqué par lib/packs.ts" },
  { name: "user_albums", description: "Collection : une ligne par album possédé, avec le nombre d'exemplaires" },
  { name: "pack_openings", description: "Historique des ouvertures de packs" },
  { name: "friendships", description: "Amitiés et demandes d'amis, une ligne par paire de joueurs" },
  { name: "trades", description: "Propositions d'échange : album et/ou pièces de chaque côté, statut" },
  { name: "user_quests", description: "Progression des quêtes par joueur et par période, récompense récupérée ou non" },
  { name: "pass_progress", description: "Passe de combat : XP par joueur et par saison (mois, premier jour), settled = saison passée dont les paliers non réclamés ont été versés ; classement saisonnier : season_points, points_at (dernier point, départage les égalités), ranked = place de la saison passée déjà examinée" },
  { name: "season_awards", description: "Récompenses du classement saisonnier versées (top 20) : saison, place, points, pièces et packs" },
  { name: "pass_claims", description: "Paliers du passe récupérés : saison, palier (1 à 30), ligne (free ou premium), auto = versé en fin de saison" },
  { name: "daily_draws", description: "Pioche du jour : album tiré par joueur et par jour (heure de Paris), position du morceau montré, réponse, réussite et série en cours" },
  { name: "artist_set_rewards", description: "Collections d'artiste terminées : récompense récupérée par joueur et par artiste (taille du set, pièces, pack), une seule fois" },
  { name: "user_achievements", description: "Succès débloqués par joueur (clé du succès, pièces versées, date, notification déjà affichée ou non). La liste des succès est dans lib/achievement-rules.ts" },
  { name: "listings", description: "Annonces du marché : vente en pièces ou troc contre un album" },
  { name: "market_sales", description: "Ventes en pièces sur le marché, base de la cote des albums" },
];

const ENV_VARS = [
  { name: "POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB", description: "Identifiants de la base PostgreSQL (conteneur db)" },
  { name: "DATABASE_URL", description: "Adresse de connexion à PostgreSQL utilisée par l'application" },
  { name: "REDIS_URL", description: "Adresse de Redis (cache des API externes, compteurs de tentatives)" },
  { name: "AUTH_SECRET", description: "Clé de signature des sessions Auth.js (obligatoire)" },
  { name: "AUTH_URL", description: "Adresse publique du site, utilisée par Auth.js" },
  { name: "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS", description: "Serveur d'envoi des e-mails (Brevo : smtp-relay.brevo.com, port 587, identifiant et clé SMTP du compte). SMTP_HOST vide en développement : les e-mails sont affichés dans les logs" },
  { name: "MAIL_FROM", description: "Expéditeur des e-mails (ex. Musicodex <no-reply@musicodex.fr>)" },
  { name: "PUBLIC_BASE_URL", description: "Adresse publique pour les URLs canoniques et le sitemap" },
  { name: "SEO_INDEXING", description: "\"true\" pour autoriser l'indexation par les moteurs de recherche. Désactivé tant que le domaine n'est pas en ligne" },
  { name: "GOOGLE_SITE_VERIFICATION", description: "Code de vérification Google Search Console (facultatif, une fois le domaine en ligne)" },
  { name: "MUSICBRAINZ_CONTACT", description: "Contact envoyé à MusicBrainz dans le User-Agent (optionnel)" },
  { name: "LISTENBRAINZ_API_URL", description: "Adresse de l'API ListenBrainz (vide = https://api.listenbrainz.org/1). Secours quand l'adresse principale est en panne : https://beta-api.listenbrainz.org/1" },
  { name: "LASTFM_API_KEY", description: "Clé Last.fm pour les écoutes affichées sur les fiches album (optionnelle)" },
  { name: "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PREMIUM", description: "Paiement Stripe de l'abonnement premium : clé secrète (sk_test_ ou sk_live_), secret de signature du webhook (whsec_) et identifiant du prix mensuel (price_). Vides = paiement désactivé. Secrets : jamais dans le code ni dans Git" },
  { name: "LEGAL_PUBLISHER, LEGAL_CONTACT_EMAIL, LEGAL_HOST", description: "Éditeur du site, adresse de contact (questions et droits RGPD) et hébergeur (nom, adresse, téléphone), affichés dans les pages légales. Obligatoires avant la mise en ligne" },
  { name: "LEGAL_SELLER, LEGAL_MEDIATOR", description: "Pour les CGV : adresse et numéro SIRET du vendeur, médiateur de la consommation (nom et site). Obligatoires avant d'ouvrir le paiement" },
];

const COMMANDS = [
  { command: "docker compose up -d", description: "Lancer PostgreSQL et Redis (dans Docker)" },
  { command: "npm run dev", description: "Appliquer les migrations puis lancer le site en développement (logs et e-mails affichés dans le terminal)" },
  { command: "npm test", description: "Lancer les tests (Vitest)" },
  { command: "npm run migrate", description: "Appliquer à la main les migrations en attente" },
  { command: "docker compose down", description: "Arrêter PostgreSQL et Redis" },
  { command: "docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build", description: "Lancer la version de production (image construite à partir du Dockerfile)" },
  { command: "deploy/envoyer-env.sh utilisateur@serveur", description: "Envoyer .env.prod (réglages de production, modifiés sur ton ordinateur) au serveur et relancer l'application" },
  { command: "npm run import:catalog", description: "Importer le catalogue de test (data/seed-albums.json)" },
  { command: "npm run import:catalog -- --listenbrainz", description: "Importer les albums les plus écoutés sur ListenBrainz (sans clé)" },
  { command: "npm run import:catalog -- --listenbrainz --artists 1000 --similar 5 --min-listens 1000", description: "Catalogue élargi : discographies des 1 000 artistes les plus écoutés de chaque période et de leurs artistes proches (plusieurs heures la première fois : une requête MusicBrainz par seconde)" },
  { command: "npm run import:catalog -- --listens", description: "Mettre à jour les écoutes et recalculer la rareté de tout le catalogue" },
  { command: "npm run import:lastfm", description: "Récupérer les écoutes Last.fm des albums jamais vérifiés ou vérifiés il y a plus de 30 jours (clé LASTFM_API_KEY dans .env, environ 4 albums par seconde). Options --days 0 pour tout le catalogue, --max 200 pour un essai" },
  { command: "npm run import:photos", description: "Photos des artistes (onglet Artistes de la collection) depuis Deezer, sans clé : artistes jamais cherchés ou sans photo depuis 30 jours (--days 0 : tous les sans-photo, --max N : essai). Aussi lancé à la fin de import:catalog" },
  { command: "npm run check:covers", description: "Vérifier que chaque pochette s'affiche encore et remplacer celles en panne (Cover Art Archive, sinon Deezer). Option --max 200 pour un essai" },
  { command: "npm run purge:inactive", description: "Comptes inactifs : e-mail d'avertissement à 3 ans moins 30 jours sans visite, suppression 30 jours après, liens e-mail expirés effacés. À lancer chaque jour en production. Option --dry-run pour compter sans rien faire" },
  { command: "npm run premium -- <email> <jours>", description: "Compte premium attribué à la main (pas encore de paiement) : ajoute N jours à partir de la fin du premium en cours ; 0 retire le premium" },
  { command: "npm run seed:demo", description: "Créer des données de démonstration (compte demo@demo.invalid / demo-album, 8 autres joueurs, marché, bourse, échanges). Refusé en production" },
];

const LOTS = [
  { lot: "0", name: "Socle", status: "Terminé", branch: "lot0-socle" },
  { lot: "1", name: "Inscription et connexion", status: "Terminé", branch: "lot1-auth" },
  { lot: "2", name: "Catalogue d'albums", status: "Terminé", branch: "lot2-catalogue" },
  { lot: "3", name: "Packs, collection et fiche album", status: "Terminé", branch: "lot3-packs" },
  { lot: "4", name: "Amis et échanges directs", status: "Terminé", branch: "lot4-amis" },
  { lot: "5", name: "Marché", status: "Terminé", branch: "lot5-marche" },
  { lot: "6", name: "Bourse (Lightweight Charts)", status: "Terminé", branch: "lot6-bourse" },
  { lot: "7", name: "Classement", status: "Terminé", branch: "lot7-classement" },
  { lot: "8", name: "Quêtes", status: "Terminé", branch: "lot8-quetes" },
  { lot: "9", name: "SEO", status: "Terminé", branch: "lot9-seo" },
  { lot: "10", name: "Mise en production", status: "Préparé, pas encore déployé", branch: "lot10-prod" },
  { lot: "C1", name: "Correctif : environnement de dev (docker compose watch)", status: "Terminé", branch: "correctif1-env-dev" },
  { lot: "C2", name: "Correctif : options avancées de Next 16 désactivées, contournements retirés", status: "Terminé", branch: "correctif2-next-options" },
  { lot: "C3", name: "Correctif : proxy.ts lit la session via Auth.js (cookie __Secure- reconnu en HTTPS)", status: "Terminé", branch: "correctif3-proxy-cookie" },
  { lot: "C4", name: "Correctif : erreurs d'échange conservées, annonces en double, callbackUrl, pages de connexion quand on est connecté, quêtes d'échange", status: "Terminé", branch: "correctif4-bugs-fonctionnels" },
  { lot: "C5", name: "Correctif : vérification de l'e-mail, reprise d'un compte non vérifié par Google, limitation des tentatives (connexion, inscription, e-mails)", status: "Terminé", branch: "correctif5-email-limites" },
  { lot: "C6", name: "Correctif : outil de migration automatique, tests automatiques (Vitest, base de test séparée) et intégration continue GitHub Actions", status: "Terminé", branch: "correctif6-tests-ci" },
  { lot: "C7", name: "Correctif : environnement de dev dans WSL (Node natif, seuls PostgreSQL et Redis dans Docker)", status: "Terminé", branch: "correctif7-wsl" },
  { lot: "C8", name: "Correctif : catalogue depuis ListenBrainz et MusicBrainz (sans clé), rareté selon les écoutes réelles, Last.fm retiré", status: "Terminé", branch: "correctif8-catalogue" },
  { lot: "D1", name: "Design « version jeu » : barre de jeu en bas, barre d'infos en haut, toutes les pages restylées, animation d'ouverture des packs", status: "Terminé", branch: "design1-version-jeu" },
  { lot: "D2", name: "Design : connexion et inscription au thème du jeu, pochettes de secours (vinyle à la place d'une image en panne, script de réparation, pochette Deezer à l'import)", status: "Terminé", branch: "design2-auth-pochettes" },
  { lot: "C9", name: "Correctif : rareté selon les écoutes totales, plafonnées à 100 par auditeur (au lieu du nombre d'auditeurs)", status: "Terminé", branch: "correctif9-rarete-ecoutes" },
  { lot: "D3", name: "Marché et bourse : tri (prix, rareté, variation), pagination du marché par la base (24 annonces par page), affichage progressif de la bourse", status: "Terminé", branch: "design3-tri-pagination" },
  { lot: "D4", name: "Comptes : confirmation du mot de passe à l'inscription, mot de passe oublié (e-mail + page de changement), modèles d'e-mails HTML aux couleurs du jeu", status: "Terminé", branch: "design4-comptes-emails" },
  { lot: "D5", name: "SEO et performances : schema.org (WebSite, VideoGame, MusicAlbum, fil d'Ariane), titres h1/h2, accueil enrichi, robots et sitemap, image de partage, icônes et manifeste, pochettes optimisées (WebP, cache 30 jours), en-têtes de sécurité, préparation de la mise en production (Caddy)", status: "Terminé", branch: "design5-seo-performances" },
  { lot: "C10", name: "Correctif : marché et échanges réservés aux adresses e-mail vérifiées, un seul compte par boîte mail (adresses avec « + » et points Gmail rattachées au compte d'origine)", status: "Terminé", branch: "correctif10-email-verifie" },
  { lot: "C11", name: "Correctif : catalogue élargi (discographies des artistes les plus écoutés de chaque période et de leurs artistes proches, 1 000 écoutes minimum)", status: "Terminé", branch: "correctif11-catalogue-elargi" },
  { lot: "G1", name: "Pioche du jour : un album par joueur et par jour, un morceau de pochette, une seule réponse avec recherche guidée, série de 7 = 1 pack", status: "Terminé", branch: "jeu1-pioche-du-jour" },
  { lot: "G2", name: "Collections d'artiste : un set par artiste d'au moins 3 albums, progression dans la collection, récompense unique en pièces (et un pack pour les grands sets)", status: "Terminé", branch: "jeu2-collections-artiste" },
  { lot: "G3", name: "Succès et badges : 22 objectifs permanents (collection, raretés, packs, artistes, social, pioche), pièces versées au déblocage, notification dorée, grille sur le profil, nombre de succès des amis", status: "Terminé", branch: "jeu3-succes" },
  { lot: "G4", name: "Économie : les quêtes rapportent des packs (Solo d'un album, ou classiques), réserve de packs gagnés sans maximum, plus de pièces de remplacement ; raccourci de la pioche dans la barre du haut ; vinyle de chargement centré et ouverture de pack sans clignotement", status: "Terminé", branch: "jeu4-economie" },
  { lot: "G5", name: "Ouverture des packs une carte à la fois : flèches pour avancer et revenir, points de progression, clavier et glissement ; « Tout ouvrir » retiré", status: "Terminé", branch: "jeu5-ouverture-carte" },
  { lot: "C12", name: "Correctif : écoutes Last.fm sur la fiche album (chiffres plus parlants, source indiquée), npm run import:lastfm, récupérées aussi à la fin de l'import du catalogue ; la rareté reste sur ListenBrainz", status: "Terminé", branch: "correctif12-lastfm" },
  { lot: "R1", name: "Données personnelles (RGPD) : mentions légales, politique de confidentialité, CGU, case d'acceptation à l'inscription, téléchargement des données, suppression du compte, suppression des comptes inactifs depuis 3 ans", status: "Terminé", branch: "rgpd1-donnees" },
  { lot: "C13", name: "Correctif : les packs Solo (1 album) ne font plus avancer les quêtes « Ouvre N packs » ; les packs de 5 cartes, du stock ou gagnés, comptent toujours", status: "Terminé", branch: "correctif13-quetes-packs" },
  { lot: "P1", name: "Packs Épique et Légendaire (5 cartes, une de leur rareté garantie), compte premium attribué à la main (npm run premium) avec un stock de 15 packs, taxe de 5 % détruite sur les ventes du marché", status: "Terminé", branch: "passe1-packs-premium" },
  { lot: "P2", name: "Passe de combat : XP par carte selon la rareté (tous les packs et la pioche du jour), 30 paliers par mois, ligne gratuite et ligne premium (packs uniquement, jamais de pièces), versement automatique en fin de saison, page /passe et jauge dans la barre du haut", status: "Terminé", branch: "passe2-combat" },
  { lot: "S1", name: "Classement saisonnier : onglet Saison, points du mois gagnés seulement en ouvrant des packs (1 / 2 / 5 / 10 / 25 par carte, doublons compris), top 20 récompensé en pièces et packs à la première visite du mois suivant", status: "Terminé", branch: "saison1-classement" },
  { lot: "PAY1", name: "Préparation du paiement Stripe : variables STRIPE_* dans .env, page /premium façon édition deluxe d'un album (pochette, prix, liste des avantages) avec bouton de paiement désactivé, liens depuis le passe et le profil ; une quête premium par période (journalière, hebdomadaire, mensuelle) ; premier mois offert (30 jours, une fois par compte) et page /cgv ; adresse de l'API ListenBrainz réglable (LISTENBRAINZ_API_URL)", status: "Terminé", branch: "paiement1-stripe" },
  { lot: "V1", name: "Disque d'Or : le passe de combat est renommé et sa page devient un vinyle (paliers sur le sillon, bras de platine sur la position actuelle) ; l'ancienne vue reste sur /passe/liste", status: "Terminé", branch: "paiement1-stripe" },
  { lot: "SEC1", name: "Sécurité : contrôle complet du site ; une carte ne peut plus être dupliquée par un échange et un achat simultanés ; Nodemailer 10 (failles connues) ; connexion Google retirée pour l'instant ; réglages séparés .env (local) et .env.prod (serveur, envoyé par deploy/envoyer-env.sh) ; e-mails par Brevo (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)", status: "Terminé", branch: "paiement1-stripe" },
  { lot: "MAIL1", name: "E-mails : logo vinyle (PNG) à la place de la note ; e-mails de l'abonnement premium (début avec ou sans mois offert, reçu mensuel, rappel de fin du mois offert, résiliation envoyée dès maintenant, paiement refusé)", status: "Terminé", branch: "paiement1-stripe" },
  { lot: "PHOTO1", name: "Photos d'artistes : photo Deezer à la place de l'initiale dans l'onglet Artistes de la collection (table artist_photos, migration 026, npm run import:photos, lancé aussi à la fin de import:catalog). Anti-homonyme : on ne garde un artiste Deezer du même nom que si l'un de ses albums porte le titre d'un album du catalogue ; sinon l'initiale reste", status: "Terminé", branch: "paiement1-stripe" },
  { lot: "PAY2", name: "Paiement Stripe : abonnement via Stripe Checkout, webhook qui prolonge premium_until, résiliation depuis le portail client Stripe, CGV et mentions de paiement", status: "À faire", branch: "-" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 text-zinc-700">{children}</div>
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-300">
            {headers.map((header) => (
              <th key={header} className="py-2 pr-4 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-zinc-100 align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-4">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocumentationPage() {
  return (
    <>
      <SiteNav />
      {/* Page technique : garde un fond clair, plus lisible pour de longs textes et des tableaux */}
      <main className="game-page">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white px-5 py-8 leading-relaxed text-zinc-900">
        <h1 className="text-3xl font-semibold">Documentation technique</h1>
        <p className="mt-2 text-zinc-600">
          Musicodex (ex-« Album », domaine <code>musicodex.fr</code>) est un jeu de collection de cartes d&apos;albums de musique, inspiré de Wikimaster. Les cartes sont
          tirées dans des packs, échangées entre joueurs, et classées selon leur rareté.
        </p>

        <Section title="Stack technique">
          <ul className="list-disc space-y-1 pl-6">
            <li>Next.js 16 (App Router, TypeScript, Turbopack) et React 19, en configuration standard : les options avancées (<code>cacheComponents</code>, <code>partialPrefetching</code>) sont désactivées. Le layout racine rend tout le site à chaque requête (<code>dynamic = &quot;force-dynamic&quot;</code>) : la session, la base et les variables de <code>.env</code> sont lues au lancement, pas au build.</li>
            <li>Tailwind CSS 4 pour le style</li>
            <li>PostgreSQL 16 pour les données, Redis 7 pour le cache des API externes</li>
            <li>Auth.js (next-auth 5 bêta) : e-mail et mot de passe (connexion Google retirée pour l&apos;instant, à refaire plus tard)</li>
            <li>bcryptjs pour le hachage des mots de passe</li>
            <li>Docker Compose pour l&apos;environnement local</li>
          </ul>
        </Section>

        <Section title="Lancer le projet en local">
          <ol className="list-decimal space-y-1 pl-6">
            <li>Copier <code>.env.example</code> en <code>.env</code> et remplir les valeurs.</li>
            <li>Installer les dépendances : <code>npm ci</code>.</li>
            <li>Lancer PostgreSQL et Redis : <code>docker compose up -d</code>.</li>
            <li>Lancer le site : <code>npm run dev</code> (applique les migrations, puis démarre Next.js).</li>
            <li>Ouvrir http://localhost:3000 et vérifier http://localhost:3000/api/health.</li>
          </ol>
          <p className="mt-3">Sous Windows, le projet vit dans WSL (Ubuntu), dans le dossier Linux <code>~/Album</code>, avec Node 22 installé par nvm. Seuls PostgreSQL et Redis tournent dans Docker. Le site tourne directement dans Linux : le rechargement à chaud est immédiat. Un dossier sous <code>C:\</code> est à éviter : les accès y sont lents et Turbopack y voyait de faux changements (pages rechargées en boucle).</p>
          <p className="mt-3">En développement, <code>.env</code> pointe vers <code>localhost</code>. En production (<code>docker-compose.prod.yml</code>), l&apos;application est dans Docker et ces adresses sont remplacées par <code>db</code> et <code>redis</code>.</p>
        </Section>

        <Section title="Interface (version jeu)">
          <ul className="list-disc space-y-1 pl-6">
            <li>Styles dans <code>app/globals.css</code> : couleurs (fond aubergine nuit, or pour packs et pièces, corail pour les notifications, une couleur par rareté), polices Lilita One (titres, chiffres), Chakra Petch (interface) et Nunito (texte), éléments en relief avec une tranche 3D.</li>
            <li><code>components/site-nav.tsx</code> : barre d&apos;infos en haut (avatar et pseudo vers le profil, pièces, packs et minuteur du prochain pack) et barre de jeu en bas (<code>components/game-nav.tsx</code>) : Collection, Marché (plateau Marché / Bourse / Échanges), vinyle central des Packs (pastille = packs prêts, anneau = progression du suivant), Quêtes (pastille = récompenses à réclamer), Social (plateau Amis / Classement, pastille = demandes d&apos;ami et échanges reçus).</li>
            <li>Messages de retour : les actions redirigent avec <code>?message=</code>, affiché en haut puis retiré de l&apos;adresse.</li>
            <li>Ouverture des packs : par défaut le joueur retourne lui-même chaque carte (« tout révéler » possible) ; le réglage « Révéler automatiquement » (Profil ou page Packs) les retourne une à une. Halo de couleur pour rare et plus, reflet pour épique et plus, et pour une légendaire : carte qui se soulève, ondes sonores, notes de musique et léger flash doré.</li>
            <li>Animations coupées quand l&apos;appareil demande moins d&apos;animations (<code>prefers-reduced-motion</code>).</li>
            <li>Connexion et inscription (<code>app/(auth)/</code>) : même thème, sans barre de jeu (logo vinyle, carte en relief, bouton doré). Après une erreur, l&apos;e-mail et le pseudo saisis restent dans le formulaire (jamais le mot de passe).</li>
            <li>Pochettes (<code>components/cover-image.tsx</code>) : si l&apos;image ne répond pas, la grande version est essayée, puis un vinyle aux couleurs de la rareté avec le titre de l&apos;album s&apos;affiche à la place.</li>
            <li>Marché : tri (récentes, prix croissant ou décroissant, rareté) et pages de 24 annonces, calculés par la base (<code>listMarketPage</code>) ; tri, rareté et page restent dans l&apos;adresse (<code>?tri=&amp;rarete=&amp;page=</code>). Bourse : tri (plus échangées, prix, hausse, baisse) et recherche instantanés, 30 lignes affichées puis la suite en arrivant en bas de la liste.</li>
            <li>La documentation garde son propre style.</li>
          </ul>
        </Section>

        <Section title="Commandes utiles">
          <Table headers={["Commande", "Rôle"]} rows={COMMANDS.map((item) => [item.command, item.description])} />
        </Section>

        <Section title="Variables d'environnement">
          <p className="mb-3">Les valeurs sont dans <code>.env</code> (jamais versionné). Seuls les noms sont listés ici.</p>
          <Table headers={["Variable", "Rôle"]} rows={ENV_VARS.map((item) => [item.name, item.description])} />
        </Section>

        <Section title="Routes du site">
          <Table headers={["Adresse", "Description"]} rows={ROUTES.map((item) => [item.path, item.description])} />
        </Section>

        <Section title="Base de données">
          <Table headers={["Table", "Contenu"]} rows={TABLES.map((item) => [item.name, item.description])} />
          <p className="mt-3">
            Les migrations sont dans <code>db/migrations/</code>. Au démarrage de l&apos;application (dev et production), <code>scripts/migrate.mjs</code> applique dans l&apos;ordre des numéros celles qui ne l&apos;ont pas encore été et les note dans <code>schema_migrations</code>. Chaque migration est appliquée entièrement ou pas du tout. Une migration déjà appliquée n&apos;est jamais relancée : pour changer le schéma, ajouter un nouveau fichier plutôt que modifier un ancien.
          </p>
        </Section>

        <Section title="Règles du jeu">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Packs :</strong> 5 cartes par pack. Un pack se recharge toutes les 5 minutes, 10 maximum en stock.
              Un nouveau compte commence avec 3 packs.
            </li>
            <li>
              <strong>Packs gagnés :</strong> les récompenses (quêtes, séries de la pioche, grands sets d&apos;artiste) vont dans une réserve à part,
              sans maximum : packs classiques (5 albums) et packs Solo (1 album). « Ouvrir un pack » prend d&apos;abord un pack du stock qui se
              recharge, puis un pack gagné. La barre du haut affiche les packs gagnés en « +N ». Les quêtes « Ouvre N packs » comptent
              tous les packs de 5 cartes (stock ou gagnés, Épique et Légendaire compris), pas les packs Solo d&apos;un album.
            </li>
            <li>
              <strong>Packs Épique et Légendaire :</strong> 5 cartes, dont la première est tirée dans le palier garanti (épique ou légendaire,
              repli sur le palier voisin si le catalogue n&apos;en a pas) ; les 4 autres suivent les chances habituelles. Gagnés seulement en
              récompense (passe de combat), ils vont dans la réserve des packs gagnés.
            </li>
            <li>
              <strong>Premium :</strong> attribué à la main (<code>npm run premium</code>), sans paiement pour l&apos;instant
              (<code>lib/premium.ts</code>). Avantage : stock de 15 packs au lieu de 10. Un premium expiré garde ses packs au-dessus de 10,
              la recharge reprend quand il redescend sous 10. La page <code>/premium</code> présente l&apos;offre (2,99 € par mois,
              <code>lib/premium-offer.ts</code>) ; son bouton de paiement reste désactivé tant que Stripe n&apos;est pas branché.
              Le profil a une rubrique « Mon abonnement » : date de fin et résiliation (case à cocher puis bouton). La résiliation prend
              effet tout de suite (<code>cancelPremium</code> remet <code>premium_until</code> à null) : plus de stock à 15, de ligne
              premium ni de quêtes premium, même s&apos;il restait des jours ; les cartes, pièces et packs déjà gagnés restent. Le premier mois offert ne sert
              qu&apos;une fois : dès qu&apos;un compte est premium (essai, abonnement ou <code>npm run premium</code>),
              <code>premium_trial_used_at</code> est rempli et la page premium et le profil n&apos;affichent plus le mois offert, même après
              une résiliation (migration 025).
            </li>
            <li>
              <strong>Passe de combat</strong> (<code>lib/pass-rules.ts</code>, <code>lib/pass.ts</code>) : chaque carte obtenue rapporte de
              l&apos;XP (commun 10, peu commun 20, rare 50, épique 120, légendaire 300), dans la même transaction que l&apos;ouverture du pack
              ou la pioche trouvée ; les cartes achetées ou échangées n&apos;en rapportent pas. 1 000 XP par palier, 30 paliers, saison = mois
              UTC. Récompenses en packs uniquement (gratuit : Solo, classiques, 2 Épiques ; premium : classiques, 2 Épiques, 1 Légendaire),
              jamais de pièces. La ligne premium se réclame si le joueur est premium au moment de réclamer. À la première visite d&apos;un
              nouveau mois, la barre du haut verse les paliers atteints et non réclamés des saisons passées (premium seulement si le
              premium couvrait la fin de la saison) et l&apos;annonce. Sous 430 px de large, la barre du haut masque le pseudo pour faire
              de la place à la jauge du passe.
            </li>
            <li>
              <strong>Classement saisonnier</strong> (<code>lib/season-rules.ts</code>, <code>lib/season.ts</code>) : chaque carte obtenue
              en ouvrant un pack (quel qu&apos;il soit) rapporte ses points de rareté pour le mois, doublons compris ; marché, échanges et
              pioche du jour ne comptent pas. Égalité : le premier arrivé au score passe devant. Le mois fini, à la première visite
              du joueur, sa place est calculée et le top 20 reçoit sa récompense une seule fois (1er : 3 000 pièces + 1 Légendaire
              + 2 Épiques ; 2e : 2 000 + 1 Légendaire + 1 Épique ; 3e : 1 500 + 1 Légendaire ; 4e-10e : 750 + 1 Épique ; 11e-20e :
              300 + 2 packs), environ 15 000 pièces par mois pour tout le jeu.
            </li>
            <li>
              <strong>Taxe du marché :</strong> le vendeur reçoit le prix moins 5 % (arrondi à l&apos;unité inférieure,
              <code>lib/market-rules.ts</code>) ; la taxe disparaît du jeu pour freiner l&apos;inflation des pièces. La Bourse garde le prix
              payé par l&apos;acheteur. Les échanges directs ne sont pas taxés.
            </li>
            <li>
              <strong>Ouverture :</strong> un pack à la fois (plus de « Tout ouvrir »), et une carte à la fois, de la moins rare à la plus rare.
              On touche la carte pour la retourner (ou elle se retourne seule avec le réglage « Révéler automatiquement ») ; les flèches,
              le clavier ou un glissement du doigt passent à la suivante ou reviennent sur les précédentes.
            </li>
            <li>
              <strong>Quêtes :</strong> journalières = 1 pack Solo ; hebdomadaires = 1 pack Solo + 100 pièces ; mensuelles = 1 pack + 500 pièces.
              Les pièces s&apos;obtiennent surtout avec les succès et les collections d&apos;artiste (et en vendant sur le marché).
              Une quête premium de plus par période (<code>premium: true</code> dans <code>lib/quests.ts</code>) : journalière = 1 pack,
              hebdomadaire = 2 packs + 200 pièces, mensuelle = 1 pack Épique + 1 000 pièces (pas de Légendaire, le passe premium en donne
              déjà un). Tout le monde progresse dessus, seul un compte premium au moment de réclamer récupère la récompense ; la pastille
              Quêtes ne la compte pas pour les autres.
            </li>
            <li>
              <strong>Raretés :</strong> Commun 65 %, Peu commun 25 %, Rare 8 %, Épique 1,5 %, Légendaire 0,5 % (par carte tirée).
              Le palier d&apos;un album dépend de son rang dans le catalogue selon ses écoutes ListenBrainz, plafonnées à 100 par
              auditeur (un auditeur écoute un album environ 23 fois ; au-delà, ce sont quelques fans qui le font tourner en boucle) : les 0,5 % les plus écoutés
              sont légendaires, les 2 % suivants épiques, puis 10 % rares, 35 % peu communs, le reste commun.
            </li>
            <li>
              <strong>Doublons :</strong> conservés. La carte affiche un badge xN quand le joueur en possède plusieurs.
            </li>
            <li>
              <strong>Points de classement :</strong> Commun 1, Peu commun 2, Rare 5, Épique 10, Légendaire 25 (un album compte une seule fois).
            </li>
            <li>
              <strong>Pièces :</strong> monnaie 100 % virtuelle, sans valeur réelle. Départ à 1 000 pièces.
            </li>
            <li>
              <strong>Marché :</strong> une annonce active par exemplaire possédé (un album en un seul exemplaire ne peut être mis en vente qu&apos;une fois).
            </li>
            <li>
              <strong>Pioche du jour :</strong> chaque jour à minuit (heure de Paris), chaque joueur tire son propre album, de préférence absent de sa collection et jamais pioché. Raretés plus généreuses que les packs : Commun 40 %, Peu commun 30 %, Rare 18 %, Épique 9 %, Légendaire 3 %. Seul un morceau de la pochette (30 % de la largeur) est montré, découpé par le serveur pour qu&apos;on ne puisse pas lire la réponse dans la page. Une seule réponse, choisie dans les suggestions (titres qui commencent par le texte tapé, puis ceux qui le contiennent) ; un album qui porte le même titre est accepté. Trouvé : la carte entre dans la collection. Raté : on ne gagne rien. Chaque série de 7 bonnes réponses d&apos;affilée offre un pack gagné. Raccourci : la pastille dorée de la barre du haut, qui brille tant que la pioche n&apos;est pas jouée.
            </li>
            <li>
              <strong>Collections d&apos;artiste :</strong> chaque artiste qui a au moins 3 albums dans le catalogue est un set à compléter (onglet Artistes de la collection, seuls les sets commencés sont affichés). Set complet : 20 pièces par point de rareté de ses albums (100 au minimum), plus un pack gagné pour les sets de 8 albums ou plus. La récompense se récupère une seule fois par artiste, même si une carte est revendue ensuite ou si l&apos;artiste reçoit de nouveaux albums.
            </li>
            <li>
              <strong>Succès :</strong> 22 objectifs permanents (albums différents, raretés possédées, packs ouverts, collections d&apos;artiste, amis, échanges, ventes, pioches trouvées). Ils sont vérifiés à chaque page : un succès atteint est débloqué une seule fois, ses pièces (50 à 2 500) sont versées tout de suite et une notification dorée l&apos;annonce. Un succès débloqué ne se reperd pas. Les joueurs existants débloquent d&apos;un coup ceux qu&apos;ils remplissent déjà.
            </li>
            <li>
              <strong>Quêtes d&apos;échange :</strong> un échange entre amis ne compte que si au moins un album change de mains (pas de pièces contre pièces). Chaque achat sur le marché compte.
            </li>
          </ul>
        </Section>

        <Section title="Catalogue">
          <p>
            Sources, toutes sans clé sauf Last.fm : ListenBrainz (albums et artistes les plus écoutés, nombre d&apos;écoutes de chaque album),
            MusicBrainz (identifiants, type d&apos;album, année ; une requête par seconde), Cover Art Archive (pochettes) et
            Deezer (liens d&apos;écoute exacts, pochette de secours). Quand un lien exact n&apos;est pas trouvé, un lien de recherche est proposé.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>ListenBrainz ne publie que les 1 000 albums les plus écoutés par période : l&apos;import combine six périodes (tous temps, année, semestre, trimestre, mois, semaine), puis peut ajouter les albums studio des artistes les plus écoutés de chaque période (<code>--artists</code>, 1 000 au maximum par période) et des artistes que les mêmes auditeurs écoutent (<code>--similar</code>). Les discographies lues sont gardées une semaine en cache : une relance ne les redemande pas.</li>
            <li>Seuls les albums studio sont gardés (pas de live, compilation, single ni bande originale), avec au moins 2 000 écoutes par défaut (<code>--min-listens</code>) et une pochette.</li>
            <li>Un album déjà présent n&apos;est pas réimporté : relancer l&apos;import reprend là où il s&apos;était arrêté.</li>
            <li>La rareté est recalculée à la fin de chaque import, et à la demande avec <code>npm run import:catalog -- --listens</code> (écoutes remises à jour).</li>
            <li>Pochettes : celle choisie par ListenBrainz, sinon l&apos;image principale sur Cover Art Archive, sinon celle de Deezer (même titre et même artiste). Une pochette peut tomber en panne après l&apos;import (image retirée, serveur en erreur) : <code>npm run check:covers</code> les vérifie toutes et remplace celles qui ne répondent plus.</li>
            <li>
              Last.fm sert seulement à afficher les écoutes sur la fiche album (sa communauté est bien plus grande que celle de
              ListenBrainz, ses chiffres sont plus parlants). Il demande une clé gratuite, <code>LASTFM_API_KEY</code> dans <code>.env</code>.
              La recherche se fait par artiste et titre (Last.fm ne connaît pas nos identifiants d&apos;album), une fois par mois au plus
              par album. Sans chiffre Last.fm, la fiche affiche celui de ListenBrainz. Il ne sert pas à la rareté, qui reste
              calculée avec ListenBrainz (son API ne permet pas de lister les albums les plus écoutés). Spotify n&apos;est pas utilisé :
              son API ne donne pas le nombre d&apos;écoutes, seulement une note de popularité qui suit les tendances du moment.
            </li>
          </ul>
        </Section>

        <Section title="Mise en production">
          <ol className="list-decimal space-y-2 pl-6">
            <li>Faire pointer le domaine vers le serveur (enregistrements DNS A et AAAA, avec et sans <code>www</code>).</li>
            <li>Réglages : deux fichiers jamais versionnés. <code>.env</code> sert à ton ordinateur ; <code>.env.prod</code> (même modèle : <code>.env.example</code>) sert au serveur. On modifie <code>.env.prod</code> sur son ordinateur puis on l&apos;envoie avec <code>deploy/envoyer-env.sh utilisateur@serveur</code> (copie par SSH et relance de l&apos;application), sans jamais l&apos;éditer sur le serveur. Il ne s&apos;appelle pas <code>.env.production</code> : Next.js chargerait ce nom tout seul lors d&apos;un build local. <code>PUBLIC_BASE_URL</code> et <code>AUTH_URL</code> y valent https://musicodex.fr.</li>
            <li>Lancer <code>docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build</code>. L&apos;image ne contient aucun fichier <code>.env</code> et tourne en utilisateur non root. Le port 3000 n&apos;écoute que sur le serveur lui-même ; les pochettes optimisées sont gardées dans le volume <code>image_cache</code>.</li>
            <li>Les migrations sont appliquées automatiquement au démarrage du conteneur, avant le serveur. Si l&apos;une échoue, le serveur ne démarre pas (voir <code>docker compose -f docker-compose.prod.yml logs app</code>).</li>
            <li>Installer Caddy et copier <code>deploy/Caddyfile</code> (remplacer <code>musicodex.fr</code> par le domaine) : HTTPS automatique (Let&apos;s Encrypt), compression, redirection de <code>www</code> vers le domaine principal, cache long des fichiers de build. Caddy place l&apos;adresse du visiteur en dernier dans <code>X-Forwarded-For</code>, ce que lisent les limites par adresse IP (avec nginx : <code>proxy_add_x_forwarded_for</code>).</li>
            <li>E-mails avec Brevo : créer le compte, ajouter le domaine musicodex.fr (Expéditeurs, domaines) et recopier chez le registrar les enregistrements DNS donnés (code Brevo, DKIM, DMARC), créer une clé SMTP, puis renseigner <code>SMTP_USER</code>, <code>SMTP_PASS</code> et <code>MAIL_FROM</code> dans <code>.env.prod</code> (adresse du domaine, avec SPF, DKIM et DMARC configurés pour ne pas finir en indésirables) : sans eux, aucun e-mail ne part.</li>
            <li>Vérifier <code>https://domaine/api/health</code>, l&apos;inscription, la réception des deux e-mails et le changement de mot de passe.</li>
            <li>Passer <code>SEO_INDEXING</code> à <code>true</code> et redémarrer l&apos;application. Dans Google Search Console : ajouter le site, coller le code de vérification dans <code>GOOGLE_SITE_VERIFICATION</code> (puis redémarrer), soumettre <code>https://domaine/sitemap.xml</code>. Faire de même dans Bing Webmaster Tools.</li>
            <li>Garder <code>SEO_INDEXING=false</code> sur une éventuelle préproduction, pour qu&apos;elle ne soit jamais indexée.</li>
          </ol>
          <p className="mt-3">Les pages joueurs redirigent vers la connexion au niveau du serveur (<code>proxy.ts</code>), avant tout rendu. La session y est lue par <code>auth()</code> d&apos;Auth.js, qui choisit le nom du cookie selon le protocole d&apos;<code>AUTH_URL</code> (préfixe <code>__Secure-</code> en HTTPS) : <code>AUTH_URL</code> doit donc être l&apos;adresse publique en https. Le proxy renvoie aussi un joueur déjà connecté qui ouvre <code>/connexion</code> ou <code>/inscription</code> vers sa destination. Après la connexion, le joueur revient sur la page demandée (<code>callbackUrl</code>), uniquement si c&apos;est un chemin interne au site (<code>lib/callback-url.ts</code>) : une adresse externe est ignorée.</p>
        </Section>

        <Section title="Comptes et sécurité">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Vérification de l&apos;e-mail :</strong> à l&apos;inscription, un lien (valable 24 h, utilisable une fois) est envoyé. Le compte est jouable tout de suite ; seuls le marché et les échanges attendent la confirmation (règle dans <code>lib/market.ts</code> et <code>lib/trades.ts</code>, écran <code>components/verify-gate.tsx</code> ; annuler une annonce ou refuser un échange reste possible). Un échange ne peut pas non plus être proposé à un ami non vérifié ; le profil affiche un bandeau tant que l&apos;adresse n&apos;est pas vérifiée, avec un bouton pour renvoyer le lien.
            </li>
            <li>
              <strong>Une boîte mail, un compte :</strong> la base calcule la « vraie » boîte de chaque adresse (<code>canonical_email</code>, colonne <code>users.email_canonical</code>, migration 013) : minuscules, sans ce qui suit un « + », et chez Gmail sans les points (<code>googlemail.com</code> = <code>gmail.com</code>). Elle est unique : <code>test+1@gmail.com</code> ou <code>t.est@gmail.com</code> ne peuvent pas créer un second compte, et se connecter avec l&apos;une de ces variantes ouvre le compte d&apos;origine. Les limites de tentatives comptent aussi par vraie boîte.
            </li>
            <li>
              <strong>Mot de passe oublié :</strong> le lien envoyé (valable 1 h, utilisable une fois, remplacé par toute nouvelle demande) permet de choisir un nouveau mot de passe. L&apos;ouvrir prouve que le joueur reçoit les e-mails de l&apos;adresse : elle est marquée vérifiée, toutes les sessions ouvertes sont coupées et les essais de connexion ratés sont oubliés. La page de demande répond la même chose qu&apos;un compte existe ou non (on ne peut pas s&apos;en servir pour savoir qui est inscrit) ; limite de 3 demandes par adresse et 10 par adresse IP et par heure.
            </li>
            <li>
              <strong>E-mails</strong> (<code>lib/email-templates.ts</code>) : compte (vérification de l&apos;adresse, mot de passe oublié, compte inactif) et abonnement premium (début avec ou sans mois offert, reçu mensuel, rappel avant la fin du mois offert, résiliation, paiement refusé), chacun en version texte et HTML (tableaux et styles écrits sur chaque balise, seule mise en page fiable dans les messageries). Logo : le vinyle de l&apos;icône du site en PNG (<code>public/email/logo.png</code>, les messageries n&apos;affichent pas le SVG). L&apos;e-mail de résiliation part déjà depuis le profil ; les autres e-mails premium seront envoyés par le webhook Stripe (lot PAY2). Aperçu en développement : <code>/apercu-emails/&lt;modèle&gt;</code> (ex. <code>verification</code>, <code>premium-recu</code>).
            </li>
            <li>
              <strong>Sessions :</strong> toutes les minutes, la session est revérifiée en base. Si le compte a disparu ou si <code>users.session_version</code> a changé, le joueur est déconnecté.
            </li>
            <li>
              <strong>Limites de tentatives</strong> (<code>lib/rate-limit.ts</code>, compteurs dans Redis) : connexion 10 essais par compte et 50 par adresse IP sur 15 minutes (appliqué aussi aux appels directs à <code>/api/auth/callback/credentials</code>) ; inscription 10 comptes par heure et par adresse IP ; renvoi du lien de vérification 3 fois par heure. Si Redis ne répond pas, les limites sont suspendues plutôt que de bloquer le site.
            </li>
          </ul>
        </Section>

        <Section title="Données personnelles (RGPD)">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Pages légales</strong> (publiques, liens en bas de l&apos;accueil, des pages de connexion et du profil, <code>components/legal-links.tsx</code>) : <code>/mentions-legales</code>, <code>/confidentialite</code>, <code>/cgu</code>. Coordonnées de l&apos;éditeur et de l&apos;hébergeur lues dans <code>LEGAL_PUBLISHER</code>, <code>LEGAL_CONTACT_EMAIL</code>, <code>LEGAL_HOST</code> (sinon « à compléter »). Date de version et durées dans <code>lib/legal.ts</code> : changer <code>LEGAL_UPDATED_AT</code> à chaque modification des textes. Pas de CGV : rien n&apos;est vendu.
            </li>
            <li>
              <strong>Acceptation :</strong> case obligatoire à l&apos;inscription (âge minimum 15 ans ou accord parental, CGU et politique de confidentialité), revérifiée par le serveur. Date dans <code>users.terms_accepted_at</code> (vide pour les comptes antérieurs au lot R1).
            </li>
            <li>
              <strong>Accès et portabilité :</strong> <code>/profil/donnees</code> télécharge un fichier JSON de toutes les données du joueur (<code>exportUserData</code>, <code>lib/account.ts</code>), sans empreinte de mot de passe ni de lien ; 5 téléchargements par heure.
            </li>
            <li>
              <strong>Effacement :</strong> <code>/profil/supprimer</code>, confirmation par le pseudo et le mot de passe (s&apos;il y en a un). Suppression immédiate de la ligne <code>users</code> : toutes les tables liées sont en <code>ON DELETE CASCADE</code>, le cache du classement est vidé. Les ventes passées (<code>market_sales</code>) restent, sans lien avec un joueur. Retour sur l&apos;accueil avec un message.
            </li>
            <li>
              <strong>Nouvelle table liée aux joueurs :</strong> l&apos;ajouter à <code>USER_TABLES</code> et à <code>exportUserData</code> (<code>lib/account.ts</code>), avec <code>ON DELETE CASCADE</code>. Un test compare cette liste aux clés étrangères de la base et échoue en cas d&apos;oubli.
            </li>
            <li>
              <strong>Comptes inactifs :</strong> <code>users.last_seen_at</code> est mis à jour au plus une fois par jour pendant la navigation. <code>npm run purge:inactive</code> (à lancer chaque jour en production, par exemple par cron) prévient par e-mail les comptes sans visite depuis 3 ans moins 30 jours (<code>users.inactivity_notice_at</code>), supprime ceux qui ne sont pas revenus 30 jours après, et efface les liens e-mail expirés. Aperçu de l&apos;e-mail : <code>/apercu-emails/inactivite</code>.
            </li>
            <li>
              <strong>Cookies :</strong> seulement ceux d&apos;Auth.js (session, sécurité de la connexion), strictement nécessaires : pas de bandeau. Polices et pochettes servies par le site (<code>next/font</code>, <code>next/image</code>) : le navigateur ne contacte aucun tiers. Ajouter une mesure d&apos;audience ou de la publicité imposerait un bandeau de consentement.
            </li>
            <li>
              <strong>Avant la mise en ligne :</strong> remplir les trois variables <code>LEGAL_*</code> ; choisir un hébergeur et un service d&apos;e-mails situés dans l&apos;Union européenne ; garder les sauvegardes de la base 30 jours au plus (promis dans la politique) ; programmer <code>purge:inactive</code> ; tenir le registre des traitements (une page suffit : finalités, données, durées, prestataires, reprendre la politique de confidentialité). Avant de faire payer le premium (les CGV sont écrites) : brancher Stripe (lot PAY2) avec l&apos;essai de 30 jours une seule fois par compte, l&apos;e-mail de rappel avant la fin de l&apos;essai et le bouton « Gérer mon abonnement » du profil promis par les CGV ; remplir <code>LEGAL_SELLER</code> (SIRET) et <code>LEGAL_MEDIATOR</code> (adhérer à un médiateur de la consommation) ; vérifier la TVA ; revoir la phrase « sans usage commercial » des pochettes dans les mentions légales, qui ne tient plus avec un abonnement payant.
            </li>
          </ul>
        </Section>

        <Section title="Référencement (SEO)">
          <ul className="list-disc space-y-1 pl-6">
            <li>Chaque page publique a son titre, sa description et son URL canonique. Pages publiques : accueil, fiches d&apos;albums, connexion, inscription et cette documentation.</li>
            <li>Les métadonnées sont placées dans le <code>&lt;head&gt;</code> pour tous les visiteurs (<code>htmlLimitedBots</code> dans <code>next.config.ts</code>), pas seulement pour les robots connus de Next.js : les aperçus de liens des messageries restent justes.</li>
            <li>Données structurées schema.org (JSON-LD) : <code>WebSite</code> et <code>VideoGame</code> (gratuit, navigateur) sur l&apos;accueil ; <code>MusicAlbum</code> (artiste, année, pochette, lien MusicBrainz) et fil d&apos;Ariane <code>BreadcrumbList</code> sur chaque fiche.</li>
            <li>Titres : un seul <code>h1</code> par page, puis des <code>h2</code> pour les sections (et <code>h3</code> pour les étapes de l&apos;accueil).</li>
            <li>Liens internes : l&apos;accueil présente des légendaires, chaque fiche liste les autres albums du même artiste.</li>
            <li>Partage : image d&apos;aperçu générée (<code>app/opengraph-image.tsx</code>, 1200 × 630), pochette pour les fiches ; carte Twitter grand format. Icônes : <code>app/icon.svg</code>, <code>app/apple-icon.tsx</code>, manifeste <code>/manifest.webmanifest</code> (ajout à l&apos;écran d&apos;accueil).</li>
            <li>Le plan du site (<code>/sitemap.xml</code>) liste les pages publiques et les fiches d&apos;albums avec pochette (49 000 au plus, limite d&apos;un plan : 50 000).</li>
            <li><code>robots.txt</code> exclut l&apos;espace joueur, les pages ouvertes depuis un e-mail, l&apos;aperçu des e-mails et l&apos;API (<code>PRIVATE_PATHS</code> dans <code>lib/seo.ts</code>). Les pages de lien reçu par e-mail sont aussi en <code>noindex</code>.</li>
            <li>Tant que <code>SEO_INDEXING</code> n&apos;est pas <code>true</code>, le site demande aux moteurs de ne rien indexer : c&apos;est le cas en local et en préproduction.</li>
            <li>Mesuré avec Lighthouse sur le build de production (mobile) : SEO 100 avec l&apos;indexation activée, accessibilité 100, bonnes pratiques 100, performance 94 à 97.</li>
          </ul>
        </Section>

        <Section title="Performances">
          <ul className="list-disc space-y-1 pl-6">
            <li>Pochettes servies par l&apos;optimiseur d&apos;images de Next.js (<code>components/cover-image.tsx</code>, réglages <code>images</code> dans <code>next.config.ts</code>) : téléchargées une fois depuis Cover Art Archive ou Deezer, redimensionnées à la taille affichée, converties en WebP et gardées 30 jours en cache. Toujours en <code>https://</code>.</li>
            <li>La pochette principale d&apos;une fiche est téléchargée en priorité ; les autres seulement quand elles approchent de l&apos;écran.</li>
            <li>La bibliothèque de graphiques (la plus lourde du site) n&apos;est chargée qu&apos;au moment d&apos;afficher un graphique.</li>
            <li>Listes longues : pagination par la base au marché, affichage par tranches à la bourse.</li>
            <li>Index PostgreSQL pour les annonces actives (date, prix, vendeur), les ventes récentes et les albums par artiste (migration 011).</li>
            <li>Polices auto-hébergées par <code>next/font</code> (aucune requête vers Google), connexion vers Cover Art Archive ouverte dès le début de la page.</li>
            <li>En-têtes de sécurité sur toutes les pages : <code>X-Content-Type-Options</code>, <code>Referrer-Policy</code>, <code>X-Frame-Options</code>, <code>Permissions-Policy</code>, HSTS (actif en HTTPS).</li>
          </ul>
        </Section>

        <Section title="Tests et intégration continue">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Lancer les tests :</strong> <code>npm test</code> (Vitest). Les tests unitaires
              (<code>tests/unit/</code>) vérifient les règles pures : tirage des packs, raretés, périodes des quêtes, liens de
              redirection, adresses IP. Les tests d&apos;intégration (<code>tests/integration/</code>) utilisent une vraie base et
              un vrai Redis : migrations, vérification d&apos;e-mail, limites de tentatives, packs,
              marché et échanges, y compris des demandes simultanées (un pack ou une annonce ne part qu&apos;une fois).
            </li>
            <li>
              <strong>Base de test :</strong> les tests d&apos;intégration utilisent la base <code>album_test</code> (créée et
              migrée automatiquement) et la base Redis n°15, vidées à chaque test. Les données du jeu ne sont jamais touchées :
              le nettoyage refuse toute base dont le nom ne finit pas par <code>_test</code>.
            </li>
            <li>
              <strong>Intégration continue :</strong> à chaque push et à chaque pull request vers <code>dev</code>,{" "}
              <code>preprod</code> ou <code>prod</code>, GitHub Actions (<code>.github/workflows/ci.yml</code>) lance le lint,
              le typage, les tests et le build de production. Le résultat est visible dans l&apos;onglet « Actions » du dépôt
              et sur chaque pull request.
            </li>
          </ul>
        </Section>

        <Section title="Branches et workflow">
          <ul className="list-disc space-y-1 pl-6">
            <li><code>dev</code> : développement local</li>
            <li><code>preprod</code> : recette avant production</li>
            <li><code>prod</code> : version en ligne</li>
            <li>Chaque lot a sa branche, qui part de la précédente tant qu&apos;elle n&apos;est pas fusionnée, puis passe par une pull request.</li>
          </ul>
        </Section>

        <Section title="Avancement des lots">
          <Table
            headers={["Lot", "Contenu", "Statut", "Branche"]}
            rows={LOTS.map((item) => [item.lot, item.name, item.status, item.branch])}
          />
        </Section>
        </div>
      </main>
    </>
  );
}
