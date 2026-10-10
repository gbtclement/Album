import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Documentation technique",
  description: "Documentation technique du site Album : stack, routes, base de données, règles du jeu et avancement.",
  alternates: { canonical: "/documentation" },
};

// Documentation technique du site. À mettre à jour à chaque lot.
// Route publique pour l'instant (pas de protection).

const ROUTES = [
  { path: "/", description: "Accueil" },
  { path: "/connexion", description: "Connexion (e-mail/mot de passe, Google si configuré)" },
  { path: "/inscription", description: "Création de compte" },
  { path: "/profil", description: "Profil du joueur (protégée)" },
  { path: "/packs", description: "Ouverture des packs et stock (protégée)" },
  { path: "/collection", description: "Collection du joueur, filtrable par rareté (protégée)" },
  { path: "/amis", description: "Demandes d'amis, liste d'amis (protégée)" },
  { path: "/echanges", description: "Propositions reçues, envoyées et historique (protégée)" },
  { path: "/echanges/nouveau", description: "Création d'une proposition d'échange avec un ami (protégée)" },
  { path: "/marche", description: "Annonces actives : achat en pièces ou troc contre un album (protégée)" },
  { path: "/marche/vendre", description: "Mise en vente d'un album, contre des pièces ou un autre album (protégée)" },
  { path: "/bourse", description: "Indice du marché, plus fortes hausses et baisses sur 30 jours (protégée)" },
  { path: "/api/market/history", description: "Historique des prix : ?album=<slug> et ?jours=<n> (30 par défaut, 365 max)" },
  { path: "/classement", description: "Top 100 des joueurs par score de rareté, et position du joueur connecté (protégée)" },
  { path: "/quetes", description: "Quêtes journalières, hebdomadaires et mensuelles, avec récupération des récompenses (protégée)" },
  { path: "/album/[slug]", description: "Fiche d'un album : pochette, rareté, liens d'écoute" },
  { path: "/verifier-email", description: "Validation de l'adresse e-mail depuis le lien reçu (lien à usage unique, valable 24 h)" },
  { path: "/documentation", description: "Cette page" },
  { path: "/sitemap.xml", description: "Plan du site : pages publiques et fiches d'albums (SEO)" },
  { path: "/robots.txt", description: "Règles pour les robots d'indexation (bloqué tant que SEO_INDEXING n'est pas true)" },
  { path: "/api/health", description: "État de l'application, de PostgreSQL et de Redis" },
  { path: "/api/auth/*", description: "Routes Auth.js (connexion, déconnexion, callbacks)" },
];

const TABLES = [
  { name: "users", description: "Joueurs : e-mail, pseudo, hash du mot de passe, pièces (coins), date de vérification de l'e-mail, version des sessions" },
  { name: "email_verifications", description: "Lien de vérification en cours par joueur (empreinte SHA-256 du jeton, date d'expiration)" },
  { name: "schema_migrations", description: "Migrations déjà appliquées (nom du fichier et date), tenue par scripts/migrate.mjs" },
  { name: "albums", description: "Catalogue : identifiant MusicBrainz, titre, artiste, pochette, écoutes et auditeurs ListenBrainz, palier de rareté, liens d'écoute" },
  { name: "pack_stocks", description: "Stock de packs par joueur et date de la dernière recharge" },
  { name: "user_albums", description: "Collection : une ligne par album possédé, avec le nombre d'exemplaires" },
  { name: "pack_openings", description: "Historique des ouvertures de packs" },
  { name: "friendships", description: "Amitiés et demandes d'amis, une ligne par paire de joueurs" },
  { name: "trades", description: "Propositions d'échange : album et/ou pièces de chaque côté, statut" },
  { name: "user_quests", description: "Progression des quêtes par joueur et par période, récompense récupérée ou non" },
  { name: "listings", description: "Annonces du marché : vente en pièces ou troc contre un album" },
  { name: "market_sales", description: "Ventes en pièces sur le marché, base de la cote des albums" },
];

const ENV_VARS = [
  { name: "POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB", description: "Identifiants de la base PostgreSQL (conteneur db)" },
  { name: "DATABASE_URL", description: "Adresse de connexion à PostgreSQL utilisée par l'application" },
  { name: "REDIS_URL", description: "Adresse de Redis (cache des API externes, compteurs de tentatives)" },
  { name: "AUTH_SECRET", description: "Clé de signature des sessions Auth.js (obligatoire)" },
  { name: "AUTH_URL", description: "Adresse publique du site, utilisée par Auth.js" },
  { name: "AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET", description: "Identifiants OAuth Google (optionnels)" },
  { name: "SMTP_URL", description: "Serveur d'envoi des e-mails (smtp://utilisateur:motdepasse@serveur:587). Vide en développement : les e-mails sont affichés dans les logs" },
  { name: "MAIL_FROM", description: "Expéditeur des e-mails (ex. Album <no-reply@domaine>)" },
  { name: "PUBLIC_BASE_URL", description: "Adresse publique pour les URLs canoniques et le sitemap" },
  { name: "SEO_INDEXING", description: "\"true\" pour autoriser l'indexation par les moteurs de recherche. Désactivé tant que le domaine n'est pas en ligne" },
  { name: "MUSICBRAINZ_CONTACT", description: "Contact envoyé à MusicBrainz dans le User-Agent (optionnel)" },
];

const COMMANDS = [
  { command: "docker compose up -d", description: "Lancer PostgreSQL et Redis (dans Docker)" },
  { command: "npm run dev", description: "Appliquer les migrations puis lancer le site en développement (logs et e-mails affichés dans le terminal)" },
  { command: "npm test", description: "Lancer les tests (Vitest)" },
  { command: "npm run migrate", description: "Appliquer à la main les migrations en attente" },
  { command: "docker compose down", description: "Arrêter PostgreSQL et Redis" },
  { command: "docker compose -f docker-compose.prod.yml up -d --build", description: "Lancer la version de production (image construite à partir du Dockerfile)" },
  { command: "npm run import:catalog", description: "Importer le catalogue de test (data/seed-albums.json)" },
  { command: "npm run import:catalog -- --listenbrainz", description: "Importer les albums les plus écoutés sur ListenBrainz (sans clé)" },
  { command: "npm run import:catalog -- --listenbrainz --artists 300", description: "Ajouter aussi les albums studio des 300 artistes les plus écoutés (long : une requête MusicBrainz par seconde)" },
  { command: "npm run import:catalog -- --listens", description: "Mettre à jour les écoutes et recalculer la rareté de tout le catalogue" },
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
      <main className="mx-auto max-w-4xl px-4 py-8 leading-relaxed">
        <h1 className="text-3xl font-semibold">Documentation technique</h1>
        <p className="mt-2 text-zinc-600">
          Album est un jeu de collection de cartes d&apos;albums de musique, inspiré de Wikimaster. Les cartes sont
          tirées dans des packs, échangées entre joueurs, et classées selon leur rareté.
        </p>

        <Section title="Stack technique">
          <ul className="list-disc space-y-1 pl-6">
            <li>Next.js 16 (App Router, TypeScript, Turbopack) et React 19, en configuration standard : les options avancées (<code>cacheComponents</code>, <code>partialPrefetching</code>) sont désactivées. Le layout racine rend tout le site à chaque requête (<code>dynamic = &quot;force-dynamic&quot;</code>) : la session, la base et les variables de <code>.env</code> sont lues au lancement, pas au build.</li>
            <li>Tailwind CSS 4 pour le style</li>
            <li>PostgreSQL 16 pour les données, Redis 7 pour le cache des API externes</li>
            <li>Auth.js (next-auth 5 bêta) : e-mail/mot de passe et Google</li>
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
              <strong>Raretés :</strong> Commun 65 %, Peu commun 25 %, Rare 8 %, Épique 1,5 %, Légendaire 0,5 % (par carte tirée).
              Le palier d&apos;un album dépend de son rang d&apos;écoutes ListenBrainz dans le catalogue : les 0,5 % les plus écoutés sont
              légendaires, les 2 % suivants épiques, puis 10 % rares, 35 % peu communs, le reste commun.
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
              <strong>Quêtes d&apos;échange :</strong> un échange entre amis ne compte que si au moins un album change de mains (pas de pièces contre pièces). Chaque achat sur le marché compte.
            </li>
          </ul>
        </Section>

        <Section title="Catalogue">
          <p>
            Sources, toutes sans clé : ListenBrainz (albums et artistes les plus écoutés, nombre d&apos;écoutes de chaque album),
            MusicBrainz (identifiants, type d&apos;album, année ; une requête par seconde), Cover Art Archive (pochettes) et
            Deezer (liens d&apos;écoute exacts). Quand un lien exact n&apos;est pas trouvé, un lien de recherche est proposé.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>ListenBrainz ne publie que les 1 000 albums les plus écoutés par période : l&apos;import combine six périodes (tous temps, année, semestre, trimestre, mois, semaine), puis peut ajouter les albums studio des artistes les plus écoutés (<code>--artists</code>).</li>
            <li>Seuls les albums studio sont gardés (pas de live, compilation, single ni bande originale), avec au moins 2 000 écoutes par défaut (<code>--min-listens</code>) et une pochette.</li>
            <li>Un album déjà présent n&apos;est pas réimporté : relancer l&apos;import reprend là où il s&apos;était arrêté.</li>
            <li>La rareté est recalculée à la fin de chaque import, et à la demande avec <code>npm run import:catalog -- --listens</code> (écoutes remises à jour).</li>
            <li>Last.fm n&apos;est plus utilisé : son API ne permet pas de lister les albums les plus écoutés.</li>
          </ul>
        </Section>

        <Section title="Mise en production">
          <ol className="list-decimal space-y-2 pl-6">
            <li>Remplir le fichier <code>.env</code> du serveur, avec <code>PUBLIC_BASE_URL</code> et <code>AUTH_URL</code> sur l&apos;adresse publique (https).</li>
            <li>Lancer <code>docker compose -f docker-compose.prod.yml up -d --build</code>. L&apos;image ne contient pas le <code>.env</code> et tourne en utilisateur non root.</li>
            <li>Les migrations sont appliquées automatiquement au démarrage du conteneur, avant le serveur. Si l&apos;une échoue, le serveur ne démarre pas (voir <code>docker compose -f docker-compose.prod.yml logs app</code>).</li>
            <li>Mettre un reverse proxy avec HTTPS devant le port 3000, sans l&apos;exposer directement. Le reverse proxy doit ajouter l&apos;adresse du visiteur à la fin de <code>X-Forwarded-For</code> (par exemple <code>proxy_add_x_forwarded_for</code> avec nginx) : les limites par adresse IP lisent la dernière valeur.</li>
            <li>Renseigner <code>SMTP_URL</code> et <code>MAIL_FROM</code> pour que les liens de vérification soient réellement envoyés.</li>
            <li>Passer <code>SEO_INDEXING</code> à <code>true</code> une fois le domaine en ligne, puis soumettre le sitemap.</li>
          </ol>
          <p className="mt-3">Les pages joueurs redirigent vers la connexion au niveau du serveur (<code>proxy.ts</code>), avant tout rendu. La session y est lue par <code>auth()</code> d&apos;Auth.js, qui choisit le nom du cookie selon le protocole d&apos;<code>AUTH_URL</code> (préfixe <code>__Secure-</code> en HTTPS) : <code>AUTH_URL</code> doit donc être l&apos;adresse publique en https. Le proxy renvoie aussi un joueur déjà connecté qui ouvre <code>/connexion</code> ou <code>/inscription</code> vers sa destination. Après la connexion, le joueur revient sur la page demandée (<code>callbackUrl</code>), uniquement si c&apos;est un chemin interne au site (<code>lib/callback-url.ts</code>) : une adresse externe est ignorée.</p>
        </Section>

        <Section title="Comptes et sécurité">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Vérification de l&apos;e-mail :</strong> à l&apos;inscription, un lien (valable 24 h, utilisable une fois) est envoyé. Le compte est jouable tout de suite ; le profil affiche un bandeau tant que l&apos;adresse n&apos;est pas vérifiée, avec un bouton pour renvoyer le lien. Les comptes Google sont vérifiés d&apos;office (Google ne transmet que des adresses qu&apos;il a vérifiées, les autres sont refusées).
            </li>
            <li>
              <strong>Connexion Google sur un compte existant :</strong> si l&apos;adresse du compte est vérifiée, Google se connecte au même compte. Sinon, rien ne prouve que le mot de passe a été choisi par le titulaire de l&apos;adresse (n&apos;importe qui peut s&apos;inscrire avec l&apos;e-mail d&apos;un autre) : le titulaire, prouvé par Google, récupère le compte. Le mot de passe est supprimé et toutes les sessions ouvertes sont coupées.
            </li>
            <li>
              <strong>Sessions :</strong> toutes les minutes, la session est revérifiée en base. Si le compte a disparu ou si <code>users.session_version</code> a changé, le joueur est déconnecté.
            </li>
            <li>
              <strong>Limites de tentatives</strong> (<code>lib/rate-limit.ts</code>, compteurs dans Redis) : connexion 10 essais par compte et 50 par adresse IP sur 15 minutes (appliqué aussi aux appels directs à <code>/api/auth/callback/credentials</code>) ; inscription 10 comptes par heure et par adresse IP ; renvoi du lien de vérification 3 fois par heure. Si Redis ne répond pas, les limites sont suspendues plutôt que de bloquer le site.
            </li>
          </ul>
        </Section>

        <Section title="Référencement (SEO)">
          <ul className="list-disc space-y-1 pl-6">
            <li>Chaque page publique a son titre, sa description et son URL canonique. La page d&apos;accueil, les fiches d&apos;albums et cette documentation sont publiques.</li>
            <li>Les fiches d&apos;albums ont des balises Open Graph (pochette) et des données structurées schema.org de type MusicAlbum.</li>
            <li>Le plan du site (<code>/sitemap.xml</code>) liste les pages publiques et toutes les fiches d&apos;albums avec pochette.</li>
            <li>Les pages réservées aux joueurs ne sont pas indexées (exclues du <code>robots.txt</code>).</li>
            <li>Tant que <code>SEO_INDEXING</code> n&apos;est pas <code>true</code>, le site demande aux moteurs de ne rien indexer : c&apos;est le cas en local.</li>
          </ul>
        </Section>

        <Section title="Tests et intégration continue">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Lancer les tests :</strong> <code>npm test</code> (Vitest). Les tests unitaires
              (<code>tests/unit/</code>) vérifient les règles pures : tirage des packs, raretés, périodes des quêtes, liens de
              redirection, adresses IP. Les tests d&apos;intégration (<code>tests/integration/</code>) utilisent une vraie base et
              un vrai Redis : migrations, vérification d&apos;e-mail, reprise de compte Google, limites de tentatives, packs,
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
      </main>
    </>
  );
}
