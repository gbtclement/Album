# Musicodex (ex-Album) — instructions pour Claude

Jeu de collection de cartes d'albums de musique, inspiré de Wikimaster. Interface en français.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack) : pages et API dans `app/`
- PostgreSQL (`lib/db.ts`) et Redis (`lib/redis.ts`), tous deux dans Docker
- Tailwind CSS 4
- Auth.js (e-mail et mot de passe ; connexion Google retirée pour l'instant), Lightweight Charts (lot 6)
- Catalogue : Last.fm (artistes et albums les plus écoutés, écoutes = rareté, seuils fixes dans lib/rarity.ts) et MusicBrainz sans clé (albums studio, identifiants, années) : `lib/lastfm.ts`, `lib/lastfm-discovery-rules.ts`, `lib/musicbrainz.ts`. ListenBrainz n'est plus utilisé

Next.js 16 a des changements par rapport aux versions habituelles : lire le guide correspondant dans `node_modules/next/dist/docs/` avant d'écrire du code.

## Commandes

Toutes les commandes se lancent dans WSL (Ubuntu-24.04), depuis `~/Album`.
- Lancer PostgreSQL et Redis : `docker compose up -d` (ils redémarrent ensuite seuls avec Docker Desktop)
- Lancer le site : `npm run dev` (puis http://localhost:3000). Le terminal affiche les logs. Rechargement à chaud natif.
- Arrêter : Ctrl+C pour le site, `docker compose down` pour la base et Redis
- Vérifier la santé : http://localhost:3000/api/health (200 si la base et Redis répondent)
- E-mails en développement : sans `SMTP_HOST`, ils ne sont pas envoyés mais affichés dans le terminal de `npm run dev` (lien de vérification à copier).
- Réglages : `.env` pour l'ordinateur, `.env.prod` pour le serveur (jamais versionnés, même modèle `.env.example`). `.env.prod` se modifie en local puis s'envoie avec `deploy/envoyer-env.sh utilisateur@serveur`. E-mails de production par Brevo (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`).
- Migrations : appliquées automatiquement par `npm run dev` (et au démarrage du conteneur en production) par `scripts/migrate.mjs` (suivi dans la table `schema_migrations`). À la main : `npm run migrate`. Ne jamais modifier une migration déjà appliquée : ajouter un nouveau fichier numéroté.
- Tests : `npm test` (Vitest). `tests/unit/` sans base ; `tests/integration/` sur la base `album_test` et Redis n°15, vidés à chaque test.
- CI : `.github/workflows/ci.yml` (lint, typage, tests, build) à chaque push et PR.
- Catalogue : `npm run import:catalog -- --lastfm` (clé `LASTFM_API_KEY`) : artistes des classements Last.fm mondial (`--top 10000`), par pays (`--countries`, `--per-country 1000`) et par genre (`--tags`, `--per-tag 500`) ; albums d'au moins `--min-plays 100000` écoutes Last.fm (versions additionnées) qui manquent au catalogue, confirmés albums studio par la discographie MusicBrainz de l'artiste (en cache Redis une semaine). `--max-artists 50` pour un essai. `--dry-run --save-candidates fichier.json` fait le parcours seul et enregistre la liste ; `--candidates fichier.json` l'importe plus tard sans refaire le parcours. Plusieurs heures (MusicBrainz : une requête par seconde). Un album déjà présent (même identifiant, ou même titre chez le même artiste) n'est pas réimporté.
- Écoutes Last.fm (fiches album ET rareté) : `npm run import:lastfm` (clé `LASTFM_API_KEY` ; une requête par artiste, artist.getTopAlbums, dont on additionne toutes les versions de chaque album, lib/lastfm-variants.ts ; album.getInfo pour les albums absents de cette liste ; 4 requêtes/s ; rareté recalculée à la fin ; chaque album revérifié au plus une fois par mois via `lastfm_checked_at`). Lancé aussi à la fin de `import:catalog` si la clé existe.
- Pochettes en panne : `npm run check:covers` (remplace par Cover Art Archive ou Deezer) ; à l'écran, `components/cover-image.tsx` affiche un vinyle de secours. Toute nouvelle image de pochette passe par `CoverImage` (next/image, parent positionné, `sizes` à la taille affichée), jamais un `<img>` brut. Un nouveau domaine d'images doit être ajouté à `images.remotePatterns` dans `next.config.ts`.
- Comptes inactifs : `npm run purge:inactive` (`--dry-run` pour compter) ; à lancer chaque jour en production.
- Premium (sans paiement pour l'instant) : `npm run premium -- <email> <jours>` (`0` retire le premium).
- Données de démonstration : `npm run seed:demo` (compte `demo@demo.invalid` / `demo-album` et 8 autres joueurs en `@demo.invalid`, recréés à chaque lancement, refusé en production).
- Si le site se recharge en boucle dans le navigateur (cache Turbopack incohérent, vu après un `npm run build`) : arrêter `npm run dev`, supprimer `.next`, relancer.
- Fichiers modifiés depuis Windows (chemin `\\wsl.localhost\Ubuntu-24.04\...`) : Turbopack peut garder l'ancienne version, surtout le CSS, même après un redémarrage. Arrêter `npm run dev`, supprimer `.next`, relancer. Après une nouvelle migration, relancer aussi (ou `npm run migrate`).

Environnement : le dépôt vit dans WSL (`~/Album`, jamais sous `C:\`, les accès disque Windows y sont lents et Turbopack y voit de faux changements). Node 22 est installé dans WSL par nvm ; seuls PostgreSQL et Redis tournent dans Docker. En dev, `.env` pointe vers `localhost` ; `docker-compose.prod.yml` remplace ces adresses par `db` et `redis`. Les scripts (`migrate`, `import:catalog`, tests) lisent `.env` eux-mêmes.
- Production (test local) : `docker compose -f docker-compose.prod.yml up -d --build`. Arrêter `npm run dev` et la dev avant (`docker compose down`), les ports sont les mêmes. Le fichier `.env` n'est jamais copié dans l'image.
Après un changement dans `.env`, relancer `npm run dev`.
Next.js 16 sans `cacheComponents` (désactivé : trop de contournements). Le layout racine déclare `export const dynamic = "force-dynamic"` : tout le site est rendu à chaque requête, les variables de `.env` sont lues au lancement et non au build. La session se lit avec `await auth()` (`@/auth`).

## Branches

- `dev` : développement local
- `preprod` : recette avant production
- `prod` : version en ligne
- Chaque lot a sa branche (`lot0-socle`, `lot1-auth`, ...) qui part de `dev`, ou du lot précédent tant qu'il n'est pas fusionné. Puis passage par une PR vers `dev`.

## Règles

- Ne jamais versionner `.env`. Les variables sont décrites dans `.env.example`.
- Ne jamais afficher les secrets (`.env`, mots de passe, clés API) dans une réponse.
- Style « version jeu » (lot D1), validé par l'utilisateur sur une maquette : styles communs dans `app/globals.css` (couleurs en variables, classes `.btn`, `.item`, `.card`, `.cover`, `.chip`, `.seg`, `.tier-<rareté>`...), barre d'infos et barre de jeu dans `components/site-nav.tsx` et `components/game-nav.tsx`. Réutiliser ces classes plutôt que des utilitaires Tailwind. Pas de barre de navigation de site ni de menu latéral ; animations sobres. Les pages de connexion/inscription suivent le même thème (classes `.auth*`) ; seule `/documentation` garde son propre style.
- SEO : chaque page publique définit son titre, sa description et son URL canonique (à partir de `PUBLIC_BASE_URL`). Un seul `h1` par page, des `h2` pour les sections (classe `.label` pour les petits titres). Une nouvelle page privée ou ouverte depuis un e-mail va dans `PRIVATE_PATHS` (`lib/seo.ts`, robots.txt). Mise en production : section « Mise en production » de `/documentation` et `deploy/Caddyfile`.
- Données personnelles (RGPD, `lib/account.ts`) : toute nouvelle table liée à un joueur va dans `USER_TABLES` et `exportUserData`, avec `ON DELETE CASCADE` (un test le vérifie). Une donnée personnelle nouvelle, un cookie, un service tiers ou un nouvel e-mail se décrit aussi dans `/confidentialite` (et `LEGAL_UPDATED_AT` dans `lib/legal.ts`). Pas de mesure d'audience ni de publicité sans bandeau de consentement.
- Documentation : la page `/documentation` (`app/documentation/page.tsx`) décrit le site techniquement (routes, tables, variables d'environnement, règles, avancement des lots). Elle est mise à jour à chaque lot. Elle est protégée par identifiant et mot de passe (Basic Auth, ligne .htpasswd dans DOC_HTPASSWD, vérifiée dans proxy.ts).
- Espace admin (`app/admin`, `lib/admin.ts`) : rôle `users.role` (`joueur` par défaut ou `admin`), changé UNIQUEMENT en base (`update users set role = 'admin' where email = '...'`), aucune page ne le modifie. `/admin` et `/documentation` répondent 404 aux non-admins (`proxy.ts`), et chaque page ou action admin relit le rôle en base (`app/admin/guard.ts`). Toute action admin est écrite dans `admin_actions`. Détection de triche : `lib/cheat-rules.ts` (règles pures, testées) et `lib/cheat-detection.ts` (lecture de l'activité) ; rien n'est sanctionné automatiquement.
