import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";

// Documentation technique du site. À mettre à jour à chaque lot.
// Route publique pour l'instant (pas de protection).

const ROUTES = [
  { path: "/", description: "Accueil" },
  { path: "/connexion", description: "Connexion (e-mail/mot de passe, Google si configuré)" },
  { path: "/inscription", description: "Création de compte" },
  { path: "/profil", description: "Profil du joueur (protégée)" },
  { path: "/packs", description: "Ouverture des packs et stock (protégée)" },
  { path: "/collection", description: "Collection du joueur, filtrable par rareté (protégée)" },
  { path: "/album/[slug]", description: "Fiche d'un album : pochette, rareté, liens d'écoute" },
  { path: "/documentation", description: "Cette page" },
  { path: "/api/health", description: "État de l'application, de PostgreSQL et de Redis" },
  { path: "/api/auth/*", description: "Routes Auth.js (connexion, déconnexion, callbacks)" },
];

const TABLES = [
  { name: "users", description: "Joueurs : e-mail, pseudo, hash du mot de passe, pièces (coins)" },
  { name: "albums", description: "Catalogue : identifiant MusicBrainz, titre, artiste, pochette, écoutes Last.fm, palier de rareté, liens d'écoute" },
  { name: "pack_stocks", description: "Stock de packs par joueur et date de la dernière recharge" },
  { name: "user_albums", description: "Collection : une ligne par album possédé, avec le nombre d'exemplaires" },
  { name: "pack_openings", description: "Historique des ouvertures de packs" },
];

const ENV_VARS = [
  { name: "POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB", description: "Identifiants de la base PostgreSQL (conteneur db)" },
  { name: "DATABASE_URL", description: "Adresse de connexion à PostgreSQL utilisée par l'application" },
  { name: "REDIS_URL", description: "Adresse de Redis (cache des API externes)" },
  { name: "AUTH_SECRET", description: "Clé de signature des sessions Auth.js (obligatoire)" },
  { name: "AUTH_URL", description: "Adresse publique du site, utilisée par Auth.js" },
  { name: "AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET", description: "Identifiants OAuth Google (optionnels)" },
  { name: "PUBLIC_BASE_URL", description: "Adresse publique pour les URLs canoniques et le sitemap" },
  { name: "LASTFM_API_KEY", description: "Clé Last.fm pour le classement des albums écoutés (optionnelle)" },
  { name: "MUSICBRAINZ_CONTACT", description: "Contact envoyé à MusicBrainz dans le User-Agent (optionnel)" },
];

const COMMANDS = [
  { command: "docker compose up -d", description: "Lancer l'application, PostgreSQL et Redis" },
  { command: "docker compose logs -f app", description: "Suivre les logs de l'application" },
  { command: "docker compose down", description: "Arrêter les conteneurs" },
  { command: "npm run import:catalog", description: "Importer le catalogue de test (data/seed-albums.json)" },
  { command: "npm run import:catalog -- --lastfm 3000", description: "Importer les 3000 albums les plus écoutés (clé Last.fm requise)" },
];

const LOTS = [
  { lot: "0", name: "Socle", status: "Terminé", branch: "lot0-socle" },
  { lot: "1", name: "Inscription et connexion", status: "Terminé", branch: "lot1-auth" },
  { lot: "2", name: "Catalogue d'albums", status: "Terminé", branch: "lot2-catalogue" },
  { lot: "3", name: "Packs, collection et fiche album", status: "Terminé", branch: "lot3-packs" },
  { lot: "4", name: "Amis et échanges directs", status: "À faire", branch: "lot4-amis" },
  { lot: "5", name: "Marché", status: "À faire", branch: "lot5-marche" },
  { lot: "6", name: "Bourse (Lightweight Charts)", status: "À faire", branch: "lot6-bourse" },
  { lot: "7", name: "Classement", status: "À faire", branch: "lot7-classement" },
  { lot: "8", name: "Quêtes", status: "À faire", branch: "lot8-quetes" },
  { lot: "9", name: "SEO", status: "À faire", branch: "lot9-seo" },
  { lot: "10", name: "Mise en production", status: "À faire", branch: "lot10-prod" },
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
            <li>Next.js 16 (App Router, TypeScript, Turbopack) et React 19</li>
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
            <li>Lancer les conteneurs avec <code>docker compose up -d</code>.</li>
            <li>Ouvrir http://localhost:3000 et vérifier http://localhost:3000/api/health.</li>
          </ol>
          <p className="mt-3">Node n&apos;est pas installé sur la machine : toutes les commandes passent par Docker.</p>
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
            Les migrations sont dans <code>db/migrations/</code>, appliquées dans l&apos;ordre des numéros.
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
              Les paliers des albums sont calculés selon leur rang d&apos;écoutes Last.fm.
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
          </ul>
        </Section>

        <Section title="Catalogue">
          <p>
            Les albums sont importés depuis MusicBrainz (métadonnées et identifiants), Cover Art Archive (pochettes),
            Last.fm (écoutes) et les liens d&apos;écoute (Spotify, Deezer, YouTube). Quand un lien exact n&apos;est pas
            trouvé, un lien de recherche est proposé à la place.
          </p>
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
